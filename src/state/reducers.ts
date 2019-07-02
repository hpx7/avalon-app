import { combineReducers, reduceCompoundActions, TypedReducer, Reducer, composeReducers } from "redoodle";
import { IApplicationState } from "../state/index";
import { SetGameId, SetHomeAction, SetPlayerName, SetGame, SetGameAction } from "./actions";
import { IGameState, IHomeState, IGame, GameAction, HomeAction } from "./types";
import { TypedAsyncLoadedReducer, AsyncLoadedValue } from "../common/redoodle";

const gameReducer = TypedAsyncLoadedReducer.builder<IGame, string>()
    .withAsyncLoadHandler(SetGame, game => game, error => error)
    .build();

const gameActionReducer = TypedReducer.builder<GameAction>()
    .withHandler(SetGameAction.TYPE, (state, gameAction) => {
        return state === gameAction ? state : gameAction;
    })
    .build();

const gameStateReducer = combineReducers<IGameState>({
    game: gameReducer,
    gameAction: gameActionReducer
});

const homeActionReducer = TypedReducer.builder<HomeAction>()
    .withHandler(SetHomeAction.TYPE, (state, homeAction) => {
        return state === homeAction ? state : homeAction;
    })
    .build();

const playerNameReducer = TypedAsyncLoadedReducer.builder<string, string>()
    .withAsyncLoadHandler(SetPlayerName, playerName => playerName, error => error)
    .build();

const gameIdReducer = TypedAsyncLoadedReducer.builder<string, string>()
    .withAsyncLoadHandler(SetGameId, gameId => gameId, error => error)
    .build();

const individualHomeStateReducer = combineReducers<IHomeState>({
    homeAction: homeActionReducer,
    playerName: playerNameReducer,
    gameId: gameIdReducer,
});

const combinedHomeStateReducer = TypedReducer.builder<IHomeState>()
    .withHandler(SetHomeAction.TYPE, (state, homeAction) => {
        if (state.homeAction === homeAction) {
            return state;
        } else {
            return {
                homeAction,
                playerName: AsyncLoadedValue.asyncNotStartedLoading(),
                gameId: AsyncLoadedValue.asyncNotStartedLoading(),
            };
        }
    })
    .build();

const homeStateReducer = composeReducers<IHomeState>(individualHomeStateReducer, combinedHomeStateReducer)

export const appReducer: Reducer<IApplicationState> = reduceCompoundActions(combineReducers<IApplicationState>({
    gameState: gameStateReducer,
    homeState: homeStateReducer,
}));
