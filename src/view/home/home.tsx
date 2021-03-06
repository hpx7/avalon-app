import React from "react";
import {
    FormGroup,
    InputGroup,
    Button,
    Intent,
    Card,
    Elevation,
    H2,
    Collapse
} from "@blueprintjs/core";
import styles from "./home.module.scss";
import { IHomeState } from "../../state";
import { IApplicationState, HomeAction, IPlayerMetadata, IGame } from "../../state/types";
import { connect } from "react-redux";
import { ContextType, getServices } from "../../common/contextProvider";
import { handleStringChange } from "../../common/handleStringChange";
import classNames from "classnames";
import { History } from "history";
import { AsyncLoadedValue, IAsyncLoaded } from "../../common/redoodle";
import sharedStyles from "../../styles/styles.module.scss";
import { assertNever } from "../../common/assertNever";
import { GamePath, JoinPath, CreatePath } from "../../paths";
import QrReader from "react-qr-reader";
import isUrl from "is-url";
import { IconNames } from "@blueprintjs/icons";
import { CookieService } from "../../common/cookie";
import * as queryString from "query-string";

interface IOwnProps {
    history: History;
    gameIdQueryParam?: string;
    homeAction: HomeAction;
}

interface IStateProps extends IHomeState {
    game: IAsyncLoaded<IGame, string>;
}

type HomeProps = IOwnProps & IStateProps;

interface IState {
    showQRCodeReader: boolean;
}

class UnconnectedHome extends React.PureComponent<HomeProps, IState> {
    public static contextTypes = ContextType;
    private static STRINGS = {
        AVALON_TITLE: "Avalon",
        JOIN_GAME_TITLE: "Join a game",
        CREATE_GAME_TITLE: "Create a game",
        USER_NAME_LABEL: "Name",
        USER_NAME_HELPER_TEXT: "Please enter your name",
        GAME_ID_HELPER_TEXT: "Please enter id of the game you would like to join",
        GAME_ID_LABEL: "Game id",
        JOIN_GAME: "Join game",
        CREATE_GAME: "Create game",
        NAME_PLACEHOLDER: "merlin",
        GAME_PLACEHOLDER: "avalon",
        DONT_HAVE_A_GAME: "Don't have a game to join?",
        ALREADY_HAVE_A_GAME: "Already have a game set up?",
        CREATE_A_GAME: "Create one!",
        JOIN_A_GAME: "Join it!",
        REQUIRED_TEXT: "(required)",
        HIDE_QR_CODE_READER: "Hide QR code reader",
        SHOW_QR_CODE_READER: "Have a QR code to scan?",
        CLEAR_GAME_ID: "Clear gameId",
        HASHTAG: "#",
    }
    private services = getServices(this.context);
    public state: IState = {
        showQRCodeReader: false,
    };

    public componentDidMount() {
        const { STRINGS } = UnconnectedHome;
        this.services.stateService.clearGame();
        this.services.stateService.setDocumentTitle(STRINGS.AVALON_TITLE);
        const { gameIdQueryParam } = this.props;
        if (gameIdQueryParam != null) {
            this.services.stateService.setGameId(gameIdQueryParam);
        }

    }

    public componentDidUpdate(prevProps: HomeProps) {
        const { gameIdQueryParam, game } = this.props;
        if (gameIdQueryParam !== prevProps.gameIdQueryParam) {
            this.services.stateService.setGameId(gameIdQueryParam);
        }
        const { game: prevGame } = prevProps;
        if (AsyncLoadedValue.isReady(game)) {
            if (!AsyncLoadedValue.isReady(prevGame) || prevGame.value.id !== game.value.id) {
                const { id, myName, myId } = game.value;
                this.storeCookieAndRedirect(id, { playerId: myId, playerName: myName });
            }
        }
    }

    public render() {
        const isJoinGameAction = this.shouldShowActionMatch(HomeAction.JOIN_GAME);
        const isCreateGameAction = this.shouldShowActionMatch(HomeAction.CREATE_GAME);
        return (
            <div className={sharedStyles.pageContentWrapper}>
                <Card elevation={Elevation.THREE} className={classNames(sharedStyles.pageContent, styles.home)}>
                    <Collapse
                        className={classNames({[styles.fadeCollapse]: isJoinGameAction})}
                        transitionDuration={400}
                        isOpen={isJoinGameAction}
                    >
                        {this.renderJoinGame()}
                    </Collapse>
                    <Collapse
                        className={classNames({[styles.fadeCollapse]: isCreateGameAction})}
                        transitionDuration={400}
                        isOpen={isCreateGameAction}
                    >
                        {this.renderCreateGame()}
                    </Collapse>
                </Card>
            </div>
        );
    }

    private renderJoinGame() {
        const { STRINGS } = UnconnectedHome;
        return [
            <H2 key="create-game-title">{STRINGS.JOIN_GAME_TITLE}</H2>,
            this.renderPlayerNameInput(),
            this.renderGameIdInput(),
            this.maybeRenderQRCodeReader(),
            <Button
                key="join-game-button"
                className={styles.actionButton}
                disabled={!this.canJoinGame()}
                intent={Intent.SUCCESS}
                text={STRINGS.JOIN_GAME}
                onClick={this.tryToJoinGame}
            />,
            <div key="toggle-create-game" className={styles.create}>
                {STRINGS.DONT_HAVE_A_GAME}
                <Button
                    onClick={this.setAction(HomeAction.CREATE_GAME)}
                    text={STRINGS.CREATE_A_GAME}
                    minimal={true}
                    intent={Intent.PRIMARY}
                />
            </div>,
        ]
    }

    private renderCreateGame() {
        const { STRINGS } = UnconnectedHome;
        return [
            <H2 key="create-game-title">{STRINGS.CREATE_GAME_TITLE}</H2>,
            this.renderPlayerNameInput(),
            <Button
                key="create-game-button"
                className={styles.actionButton}
                disabled={!this.canCreateGame()}
                intent={Intent.SUCCESS}
                text={STRINGS.CREATE_GAME}
                onClick={this.tryToCreateGame}
            />,
            <div key="toggle-join-game" className={styles.create}>
                {STRINGS.ALREADY_HAVE_A_GAME}
                <Button
                    onClick={this.setAction(HomeAction.JOIN_GAME)}
                    text={STRINGS.JOIN_A_GAME}
                    minimal={true}
                    intent={Intent.PRIMARY}
                />
            </div>,
        ]
    }

    private renderPlayerNameInput() {
        const { playerName } = this.props;
        const { STRINGS } = UnconnectedHome;
        const value = AsyncLoadedValue.getValueOrDefault(playerName, "");
        const helperText = AsyncLoadedValue.valueCheck(playerName, name => name.length === 0)
            ? STRINGS.GAME_ID_HELPER_TEXT
            : undefined;
        return (
            <FormGroup
                key="user-name-input"
                helperText={helperText}
                label={STRINGS.USER_NAME_LABEL}
                labelFor="name-input"
                labelInfo={STRINGS.REQUIRED_TEXT}
                intent={this.getIntentForValue(value)}
            >
                <InputGroup
                    id="name-input"
                    onChange={handleStringChange(this.onPlayerNameChange)}
                    placeholder={STRINGS.NAME_PLACEHOLDER}
                    value={value}
                />
            </FormGroup>
        );
    }

    private renderGameIdInput() {
        const { gameId, gameIdQueryParam } = this.props;
        const { STRINGS } = UnconnectedHome;
        const value = AsyncLoadedValue.getValueOrDefault(gameId, "");
        const helperText = AsyncLoadedValue.valueCheck(gameId, id => id.length === 0)
            ? STRINGS.GAME_ID_HELPER_TEXT
            : undefined;
        return (
            <FormGroup
                key="game-id-input"
                helperText={helperText}
                label={STRINGS.GAME_ID_LABEL}
                labelFor="game-id-input"
                labelInfo={STRINGS.REQUIRED_TEXT}
                className={styles.form}
                intent={this.getIntentForValue(value)}
            >
                <InputGroup
                    id="game-id-input"
                    disabled={gameIdQueryParam != null}
                    onChange={handleStringChange(this.onGameIdChange)}
                    placeholder={STRINGS.GAME_PLACEHOLDER}
                    rightElement={this.maybeRenderClearButton()}
                    value={value}
                />
            </FormGroup>
        );
    }

    private maybeRenderClearButton() {
        if (this.props.gameIdQueryParam != null) {
            return <Button icon={IconNames.CROSS} minimal={true} onClick={this.setAction(HomeAction.JOIN_GAME)}/>;
        }
    }

    private maybeRenderQRCodeReader() {
        const { STRINGS } = UnconnectedHome;
        if (this.props.homeAction === HomeAction.JOIN_GAME && this.props.gameIdQueryParam == null) {
            if (this.state.showQRCodeReader) {
                return (
                    <>
                        <QrReader
                            key="qr-code-reader"
                            delay={300}
                            onError={this.handleError}
                            onScan={this.handleScan}
                            className={styles.qrReader}
                        />
                        <div className={styles.qrLink} key="hide-qr-code-reader">
                            <a
                                onClick={this.toggleQRCodeReader}
                                href={STRINGS.HASHTAG}
                            >
                                {STRINGS.HIDE_QR_CODE_READER}
                            </a>
                        </div>
                    </>
                );
            } else {
                return (
                    <div className={styles.qrLink} key="show-qr-code-reader">
                        <a
                            onClick={this.toggleQRCodeReader}
                            href={STRINGS.HASHTAG}
                        >
                            {STRINGS.SHOW_QR_CODE_READER}
                        </a>
                    </div>
                );
            }
        }
    }

    private toggleQRCodeReader = () => {
        this.setState(prevState => ({ showQRCodeReader: !prevState.showQRCodeReader }));
    }

    private handleScan = (data: string | null) => {
        if (data != null && isUrl(data)) {
            window.location.href = data;
        }
    }

    private handleError = () => {
        this.services.stateService.showFailToast("Failed to parse QR code");
    }

    private getIntentForValue(value: string | undefined) {
        if (value == null) {
            return Intent.NONE;
        } else if (value.length > 0) {
            return Intent.PRIMARY;
        } else {
            return Intent.DANGER;
        }
    }

    private canJoinGame() {
        const { gameId, playerName } = this.props;
        return AsyncLoadedValue.isReady(gameId) && AsyncLoadedValue.isReady(playerName);
    }

    private canCreateGame() {
        const { gameId, playerName } = this.props;
        return AsyncLoadedValue.isReady(playerName) && AsyncLoadedValue.isNotStartedLoading(gameId);
    }

    private shouldShowActionMatch(homeAction: HomeAction) {
        return this.props.homeAction === homeAction;
    }

    private tryToJoinGame = () => {
        const { gameId, playerName } = this.props;
        if (AsyncLoadedValue.isReady(gameId) && AsyncLoadedValue.isReady(playerName)) {
            this.services.gameService.joinGame(gameId.value, playerName.value);
        }
    }

    private tryToCreateGame = () => {
        const { gameId, playerName } = this.props;
        if (AsyncLoadedValue.isNotStartedLoading(gameId) && AsyncLoadedValue.isReady(playerName)) {
            this.services.gameService.createGame(playerName.value);
        }
    }

    private setAction = (action: HomeAction) => () => {
        this.props.history.push(this.getPathForAction(action));
        this.services.stateService.clearHomeState();
    }

    private getPathForAction(action: HomeAction) {
        switch (action) {
            case HomeAction.JOIN_GAME:
                return new JoinPath().getLocationDescriptor();
            case HomeAction.CREATE_GAME:
                return new CreatePath().getLocationDescriptor();
            default:
                return assertNever(action);
        }
    }

    private onPlayerNameChange = (playerName: string) => this.services.stateService.setPlayerName(playerName);

    private onGameIdChange = (gameId: string) => this.services.stateService.setGameId(gameId);

    private storeCookieAndRedirect(gameId: string, playerMetadata: IPlayerMetadata) {
        const { history } = this.props;
        const locationDescriptor = new GamePath(gameId).getLocationDescriptor();
        if (CookieService.doesUseCookies()) {
            CookieService.createSession(gameId, playerMetadata);
            history.push(locationDescriptor);
        } else {
            locationDescriptor.search = queryString.stringify(playerMetadata);
            history.push(locationDescriptor);
        }
    }
}

function mapStateToProps(appState: IApplicationState): IStateProps {
    return {
        ...appState.homeState,
        game: appState.gameState.game,
    }
}

export const Home = connect(mapStateToProps)(UnconnectedHome);
