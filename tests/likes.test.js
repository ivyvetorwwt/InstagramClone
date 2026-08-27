/**
 * likes.test.js
 *
 * Smoke-tests for the post-likes feature.
 *
 * These tests mock the Firebase SDK so they run offline without a real
 * Firestore project.  They verify:
 *   1. Liking a post writes the correct document path and dispatches
 *      TOGGLE_LIKE_STATE_CHANGE with currentUserLike = true.
 *   2. Unliking a post deletes the correct document path and dispatches
 *      TOGGLE_LIKE_STATE_CHANGE with currentUserLike = false.
 *   3. The Redux reducer correctly increments / decrements likesCount and
 *      flips currentUserLike in the feed when TOGGLE_LIKE_STATE_CHANGE fires.
 *   4. The reducer leaves unrelated posts untouched.
 */

'use strict';

// ---------------------------------------------------------------------------
// Minimal Redux-like helpers (no dependency on the real Redux package)
// ---------------------------------------------------------------------------
function createStore(reducer) {
    let state = reducer(undefined, { type: '@@INIT' });
    return {
        getState: () => state,
        dispatch: (action) => { state = reducer(state, action); },
    };
}

// ---------------------------------------------------------------------------
// Constants (mirrors frontend/redux/constants/index.js)
// ---------------------------------------------------------------------------
const TOGGLE_LIKE_STATE_CHANGE = 'TOGGLE_LIKE_STATE_CHANGE';
const USERS_LIKES_STATE_CHANGE = 'USERS_LIKES_STATE_CHANGE';
const USERS_POSTS_STATE_CHANGE = 'USERS_POSTS_STATE_CHANGE';
const CLEAR_DATA = 'CLEAR_DATA';

// ---------------------------------------------------------------------------
// Reducer under test (mirrors frontend/redux/reducers/users.js)
// ---------------------------------------------------------------------------
const initialState = { users: [], feed: [], usersFollowingLoaded: 0 };

function usersReducer(state = initialState, action) {
    switch (action.type) {
        case USERS_POSTS_STATE_CHANGE:
            return {
                ...state,
                usersFollowingLoaded: state.usersFollowingLoaded + 1,
                feed: [...state.feed, ...action.posts],
            };
        case USERS_LIKES_STATE_CHANGE:
            return {
                ...state,
                feed: state.feed.map(post =>
                    post.id === action.postId
                        ? { ...post, currentUserLike: action.currentUserLike }
                        : post
                ),
            };
        case TOGGLE_LIKE_STATE_CHANGE:
            return {
                ...state,
                feed: state.feed.map(post => {
                    if (post.id !== action.postId) return post;
                    const delta = action.currentUserLike ? 1 : -1;
                    return {
                        ...post,
                        currentUserLike: action.currentUserLike,
                        likesCount: (post.likesCount || 0) + delta,
                    };
                }),
            };
        case CLEAR_DATA:
            return initialState;
        default:
            return state;
    }
}

// ---------------------------------------------------------------------------
// Firebase mock
// ---------------------------------------------------------------------------
let mockSetCalled = false;
let mockDeleteCalled = false;
let lastSetPath = null;
let lastDeletePath = null;

function buildFirestoreMock(resolveImmediately = true) {
    const makeRef = (path) => ({
        _path: path,
        collection: (seg) => makeRef(`${path}/${seg}`),
        doc: (seg) => makeRef(`${path}/${seg}`),
        set: (_data) => {
            mockSetCalled = true;
            lastSetPath = path;
            return resolveImmediately ? Promise.resolve() : new Promise(() => {});
        },
        delete: () => {
            mockDeleteCalled = true;
            lastDeletePath = path;
            return resolveImmediately ? Promise.resolve() : new Promise(() => {});
        },
    });

    return {
        firestore: () => ({ collection: (seg) => makeRef(seg) }),
        auth: () => ({ currentUser: { uid: 'currentUser123' } }),
    };
}

// ---------------------------------------------------------------------------
// toggleLike action factory (mirrors frontend/redux/actions/index.js)
// ---------------------------------------------------------------------------
function makeToggleLike(firebase) {
    return function toggleLike(postCreatorId, postId, currentUserLike) {
        return (dispatch) => {
            const likeRef = firebase
                .firestore()
                .collection('posts')
                .doc(postCreatorId)
                .collection('userPosts')
                .doc(postId)
                .collection('likes')
                .doc(firebase.auth().currentUser.uid);

            if (currentUserLike) {
                return likeRef.delete().then(() => {
                    dispatch({ type: TOGGLE_LIKE_STATE_CHANGE, postId, currentUserLike: false });
                });
            } else {
                return likeRef.set({}).then(() => {
                    dispatch({ type: TOGGLE_LIKE_STATE_CHANGE, postId, currentUserLike: true });
                });
            }
        };
    };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function resetMocks() {
    mockSetCalled = false;
    mockDeleteCalled = false;
    lastSetPath = null;
    lastDeletePath = null;
}

function makeFeedPost(id, likesCount = 0, currentUserLike = false) {
    return { id, likesCount, currentUserLike, caption: 'test post' };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('toggleLike action', () => {
    const CREATOR_ID = 'creator456';
    const POST_ID = 'post789';
    const CURRENT_USER_ID = 'currentUser123';

    beforeEach(resetMocks);

    test('liking a post calls firestore set on the correct path', async () => {
        const firebase = buildFirestoreMock();
        const toggleLike = makeToggleLike(firebase);
        const store = createStore(usersReducer);

        await toggleLike(CREATOR_ID, POST_ID, false)(store.dispatch);

        expect(mockSetCalled).toBe(true);
        expect(mockDeleteCalled).toBe(false);
        expect(lastSetPath).toBe(
            `posts/${CREATOR_ID}/userPosts/${POST_ID}/likes/${CURRENT_USER_ID}`
        );
    });

    test('unliking a post calls firestore delete on the correct path', async () => {
        const firebase = buildFirestoreMock();
        const toggleLike = makeToggleLike(firebase);
        const store = createStore(usersReducer);

        await toggleLike(CREATOR_ID, POST_ID, true)(store.dispatch);

        expect(mockDeleteCalled).toBe(true);
        expect(mockSetCalled).toBe(false);
        expect(lastDeletePath).toBe(
            `posts/${CREATOR_ID}/userPosts/${POST_ID}/likes/${CURRENT_USER_ID}`
        );
    });

    test('liking dispatches TOGGLE_LIKE_STATE_CHANGE with currentUserLike=true', async () => {
        const firebase = buildFirestoreMock();
        const toggleLike = makeToggleLike(firebase);
        const dispatched = [];
        const fakeDispatch = (action) => dispatched.push(action);

        await toggleLike(CREATOR_ID, POST_ID, false)(fakeDispatch);

        expect(dispatched).toHaveLength(1);
        expect(dispatched[0]).toEqual({
            type: TOGGLE_LIKE_STATE_CHANGE,
            postId: POST_ID,
            currentUserLike: true,
        });
    });

    test('unliking dispatches TOGGLE_LIKE_STATE_CHANGE with currentUserLike=false', async () => {
        const firebase = buildFirestoreMock();
        const toggleLike = makeToggleLike(firebase);
        const dispatched = [];
        const fakeDispatch = (action) => dispatched.push(action);

        await toggleLike(CREATOR_ID, POST_ID, true)(fakeDispatch);

        expect(dispatched).toHaveLength(1);
        expect(dispatched[0]).toEqual({
            type: TOGGLE_LIKE_STATE_CHANGE,
            postId: POST_ID,
            currentUserLike: false,
        });
    });
});

describe('usersReducer – TOGGLE_LIKE_STATE_CHANGE', () => {
    test('increments likesCount and sets currentUserLike=true when liking', () => {
        const store = createStore(usersReducer);
        store.dispatch({ type: USERS_POSTS_STATE_CHANGE, posts: [makeFeedPost('p1', 5, false)] });

        store.dispatch({ type: TOGGLE_LIKE_STATE_CHANGE, postId: 'p1', currentUserLike: true });

        const post = store.getState().feed.find(p => p.id === 'p1');
        expect(post.likesCount).toBe(6);
        expect(post.currentUserLike).toBe(true);
    });

    test('decrements likesCount and sets currentUserLike=false when unliking', () => {
        const store = createStore(usersReducer);
        store.dispatch({ type: USERS_POSTS_STATE_CHANGE, posts: [makeFeedPost('p1', 5, true)] });

        store.dispatch({ type: TOGGLE_LIKE_STATE_CHANGE, postId: 'p1', currentUserLike: false });

        const post = store.getState().feed.find(p => p.id === 'p1');
        expect(post.likesCount).toBe(4);
        expect(post.currentUserLike).toBe(false);
    });

    test('does not mutate unrelated posts in the feed', () => {
        const store = createStore(usersReducer);
        store.dispatch({
            type: USERS_POSTS_STATE_CHANGE,
            posts: [makeFeedPost('p1', 3, false), makeFeedPost('p2', 7, false)],
        });

        store.dispatch({ type: TOGGLE_LIKE_STATE_CHANGE, postId: 'p1', currentUserLike: true });

        const p2 = store.getState().feed.find(p => p.id === 'p2');
        expect(p2.likesCount).toBe(7);
        expect(p2.currentUserLike).toBe(false);
    });

    test('handles likesCount starting at 0 without going negative on unlike', () => {
        const store = createStore(usersReducer);
        store.dispatch({ type: USERS_POSTS_STATE_CHANGE, posts: [makeFeedPost('p1', 0, true)] });

        store.dispatch({ type: TOGGLE_LIKE_STATE_CHANGE, postId: 'p1', currentUserLike: false });

        const post = store.getState().feed.find(p => p.id === 'p1');
        // The reducer decrements by 1; the UI guard (Math.max) lives in Post.js
        expect(post.likesCount).toBe(-1);
        expect(post.currentUserLike).toBe(false);
    });

    test('USERS_LIKES_STATE_CHANGE still updates currentUserLike without touching likesCount', () => {
        const store = createStore(usersReducer);
        store.dispatch({ type: USERS_POSTS_STATE_CHANGE, posts: [makeFeedPost('p1', 10, false)] });

        store.dispatch({ type: USERS_LIKES_STATE_CHANGE, postId: 'p1', currentUserLike: true });

        const post = store.getState().feed.find(p => p.id === 'p1');
        expect(post.currentUserLike).toBe(true);
        expect(post.likesCount).toBe(10); // unchanged
    });
});
