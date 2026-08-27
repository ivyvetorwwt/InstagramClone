import { CLEAR_DATA, TOGGLE_LIKE_STATE_CHANGE, USERS_DATA_STATE_CHANGE, USERS_LIKES_STATE_CHANGE, USERS_POSTS_STATE_CHANGE } from "../constants"

const initialState = {
    users: [],
    feed: [],
    usersFollowingLoaded: 0,
}

export const users = (state = initialState, action) => {
    switch (action.type) {
        case USERS_DATA_STATE_CHANGE:
            return {
                ...state,
                users: [...state.users, action.user]
            }
        case USERS_POSTS_STATE_CHANGE:
            return {
                ...state,
                usersFollowingLoaded: state.usersFollowingLoaded + 1,
                feed: [...state.feed, ...action.posts]
            }
        case USERS_LIKES_STATE_CHANGE:
            return {
                ...state,
                feed: state.feed.map(post => post.id == action.postId ?
                    { ...post, currentUserLike: action.currentUserLike } :
                    post)
            }
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
            }
        case CLEAR_DATA:
            return initialState
        default:
            return state;
    }
}
