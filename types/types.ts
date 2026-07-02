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

export type QuestionSeed = {
    question: string,
    format: Format,
    options: string[],
    correctAnswer: string,
    pointsAwarded: number,
    pointsSubtracted: number,
    timeAwarded: number,
    timeSubtracted: number,
    livesSubtracted: number,
}

export type Format = "MCQ" | "CodeSnippet" | "TrueFalse"