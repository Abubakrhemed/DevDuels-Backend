export type Status = "OFFLINE" | "IN_LOBBY" | "IN_GAME" | "ONLINE"

export type LobbyPrivacy = "PUBLIC" | "PRIVATE"

export type Player = {
    userId: string,
    username: string,
    score: number,
    lives: number,
}

export type Lobby = {
    roomId:string,
    players: Map<string,Player>,
    privacy:LobbyPrivacy,
    maxPlayers:number,
    minPlayers:number
}