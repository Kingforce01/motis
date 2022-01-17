export interface Connection {
    stops: Stop[],
    transports: TransportInfo | WalkInfo[],
    trips: Trip[],
    problems: Problem[]
}


interface Stop {
    station: Station,
    arrival: EventInfo,
    departure: EventInfo,
    exit: boolean,
    enter: boolean
}


export interface Station {
    id: string,
    name: string,
    pos?: Position
}


export interface Position {
    lat: number,
    lng: number
}


interface EventInfo {
    time?: Date
    schedule_time?: Date
    track: string,
    reason: 'Schedule' | 'Is' | 'Propagation' | 'Forecast'
}


interface TransportInfo {
    range: Range,
    category_name: string,
    class: number,
    train_nr?: number,
    line_id: string,
    name: string,
    provider: string,
    direction: string
}


interface WalkInfo {
    range: Range,
    mumo_id: number,
    price: number,
    accessibility: number,
    mumo_type: string
}


interface Attribute {
    range: Range,
    code: string,
    text: string
}


interface Range {
    from: number,
    to: number
}


interface TripId {
    station_id: string,
    train_nr: number,
    time: number,
    target_station_id: string,
    target_time: number,
    line_id: string
}


interface Trip {
    range: Range,
    id: TripId
}


interface Problem {
    range: Range,
    typ: 'NoProblem' | 'InterchangeTimeViolated' | 'CanceledTrain'
}