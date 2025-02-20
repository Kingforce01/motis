import React, { useEffect, useState } from 'react';

import moment from 'moment';
import equal from 'deep-equal';

import { Events, RailVizStationResponse } from '../Types/RailvizStationEvent';
import { Connection, Station, TripId } from '../Types/Connection';
import { Address } from '../Types/SuggestionTypes';
import { Translations } from '../App/Localization';
import { classToId } from '../Overlay/ConnectionRender';
import { Spinner } from '../Overlay/LoadingSpinner';
import { SubOverlayEvent } from '../Types/EventHistory';
import { getStationCoords } from '../Overlay/TripView';


interface StationEvent {
    'translation': Translations,
    'station': (Station | Address),
    'displayedConnection': Connection,
    'searchDate': moment.Moment,
    'subOverlayContent': SubOverlayEvent[],
    'setTrainSelected': React.Dispatch<React.SetStateAction<TripId>>,
    'setSubOverlayContent': React.Dispatch<React.SetStateAction<SubOverlayEvent[]>> 
}


const getStationEvent = (byScheduleTime: boolean, direction: string, eventCount: number, stationID: string, time: number) => {
    return {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            destination: { type: 'Module', target: '/railviz/get_station' },
            content_type: 'RailVizStationRequest',
            content: { by_schedule_time: byScheduleTime, direction: direction, event_count: eventCount, station_id: stationID, time: time }
        })
    };
};

const stationEventDivGenerator = (eventsToDisplay: Events[], translation: Translations, displayDirection: string, subOverlayContent: SubOverlayEvent[], setSubOverlayContent: React.Dispatch<React.SetStateAction<SubOverlayEvent[]>>, setTrainSelected: React.Dispatch<React.SetStateAction<TripId>>) => {

    if(eventsToDisplay.length === 0) {
        return (
            <div className='no-results'>
                <div className='divider'></div>
                <div className='msg'>{displayDirection === 'DEP' ? translation.station.noDepartures : translation.station.noArrivals}</div>
            </div>
        )
    }
    // stationEvents response has events in both directions so it has to be filtered before rendering
    let filteredEvents = eventsToDisplay.filter(x => x.type !== (displayDirection === 'ARR' ? 'DEP' : 'ARR'));
    if (filteredEvents[filteredEvents.length - 1].dummyEvent){
        filteredEvents.pop();
    }
    if (filteredEvents[1].dummyEvent) {
        filteredEvents.shift();
    }

    let divs = [];
    for (let index = 0; index < filteredEvents.length; index++) {
        if ( filteredEvents[index].dummyEvent ) {
            divs.push(
                <div className='date-header divider' key={index}><span>{filteredEvents[index].dummyEvent}</span></div>
            )
        }else {
            divs.push(
                <div className='station-event' key={index}>
                    <div className='event-time'>{moment.unix(filteredEvents[index].event.time).format('HH:mm')}</div>
                    <div className='event-train'><span>
                        <div    className={'train-box train-class-' + filteredEvents[index].trips[0].transport.clasz + ' with-tooltip'} 
                                data-tooltip={translation.connections.provider + ': ' + filteredEvents[index].trips[0].transport.provider + '\n' + translation.connections.trainNr + ': ' + filteredEvents[index].trips[0].transport.train_nr}
                                onClick={() => {
                                    setTrainSelected(filteredEvents[index].trips[0].id);
                                    setSubOverlayContent([...subOverlayContent, {id: 'tripView', train: filteredEvents[index].trips[0].id}]);
                                }}>
                            <svg className='train-icon'>
                            <use xlinkHref={classToId({move: filteredEvents[index].trips[0].transport, move_type: 'Transport'})}></use>
                        </svg><span className='train-name'>{filteredEvents[index].trips[0].transport.name}</span></div>
                    </span></div>
                    <div className='event-direction' title={filteredEvents[index].trips[0].transport.direction}><i className='icon'>arrow_forward</i>{filteredEvents[index].trips[0].transport.direction}</div>
                    <div className='event-track'></div>
                </div>
            );
        }
    }  

    return divs;
}


const onClickHandler = (byScheduleTime: boolean, direction: string, eventCount: number, stationID: string, time: number, eventStations: Events[], setEventStations: React.Dispatch<React.SetStateAction<Events[]>>, setMinTime: React.Dispatch<React.SetStateAction<number>>, setMaxTime: React.Dispatch<React.SetStateAction<number>>, setEventsToDisplay: React.Dispatch<React.SetStateAction<Events[]>>, translation: Translations, setLoader: React.Dispatch<React.SetStateAction<boolean>>) => {
    let requestURL = 'https://europe.motis-project.de/?elm=StationEvents';
    fetch(requestURL, getStationEvent(byScheduleTime, direction, eventCount, stationID, time))
        .then(res => res.json())
        .then((res: RailVizStationResponse) => {
            if (direction === 'EARLIER') {
                if(res.content.events.length !== 0) {
                    insertDateHeader(setEventsToDisplay, [...res.content.events, ...eventStations], translation);
                    setEventStations([...res.content.events, ...eventStations]);
                    setMinTime(Math.floor(res.content.events[0].event.time / 1000) * 1000);
                }
            } else {
                if(res.content.events.length !== 0 && !equal(res.content.events[res.content.events.length - 1], eventStations[eventStations.length - 1])) {
                    insertDateHeader(setEventsToDisplay, [...eventStations, ...res.content.events], translation);
                    setEventStations([...eventStations, ...res.content.events]);
                    setMaxTime((Math.floor(res.content.events[res.content.events.length - 1].event.time / 1000) + 1) * 1000);
                }
            }
            setLoader(false);
        });
}

// if events of next or previos date are loaded, date header has to be inserted
const insertDateHeader = (setEventsToDisplay: React.Dispatch<React.SetStateAction<Events[]>>, events: Events[], translation: Translations) => {
    let dummyIndexes = [0];
    let eventsWithDummies = [...events];
    let previousConnectionDay = moment.unix(events[0].event.time);
    let dummyDays = [previousConnectionDay.format(translation.dateFormat)];

    for (let i = 1; i < events.length; i++) {
        if ( moment.unix(events[i].event.time).day() !== previousConnectionDay.day()) {
            dummyIndexes.push(i);
            previousConnectionDay.add(1, 'day');
            dummyDays.push(previousConnectionDay.format(translation.dateFormat));
        }
    };
    dummyIndexes.map((val, idx) => {
        eventsWithDummies.splice(val + idx, 0, dummyEvent(dummyDays[idx]));
    })
    setEventsToDisplay(eventsWithDummies);
};

const dummyEvent = (time: string): Events => {
    return { trips: [], type: '', event: { time: 0, schedule_time: 0, track: '', schedule_track: '', valid: false, reason: '' }, dummyEvent: time }
}

export const StationEvent: React.FC<StationEvent> = (props) => {

    const [eventStations, setEventStations] = useState<Events[]>(null);

    const [eventsToDisplay, setEventsToDisplay] = useState<Events[]>(null);

    const [loadEarlier, setLoadEarlier] = useState<boolean>(false);

    const [loadLater, setLoadLater] = useState<boolean>(false);

    const [stationName, setStationName] = useState<string>('');

    // var and constants from motis-project
    let byScheduleTime = true;
    let eventCount = 20;
    let stationID = (props.station as Station).id;
    const [time, setTime] = useState<number>((props.searchDate === null) ? 0 : props.searchDate.unix());
    const [minTime, setMinTime] = useState<number>(0);
    const [maxTime, setMaxTime] = useState<number>(Number.MAX_VALUE);
    const [displayDirection, setDisplayDirection] = useState<string>('DEP');
    const [direction, setDirection] = useState<string>('BOTH');

    // everytime a different staion or direction changed, fetch and store events
    useEffect(() => {
        if (stationID !== '') {
            let requestURL = 'https://europe.motis-project.de/?elm=StationEvents';
            fetch(requestURL, getStationEvent(byScheduleTime, direction, eventCount, stationID, time))
                .then(res => res.json())
                .then((res: RailVizStationResponse) => {
                    if (res.content.events.length === 0) {
                        setEventStations([]);
                        setEventsToDisplay([]);
                    } else {
                        setStationName(res.content.station.name);
                        insertDateHeader(setEventsToDisplay, res.content.events, props.translation);
                        setEventStations(res.content.events);
                        setMinTime(res.content.events[0].event.time);
                        setMaxTime(res.content.events[res.content.events.length - 1].event.time);
                    }
                    setDisplayDirection('DEP');
                    window.portEvents.pub('mapFlyTo', { animate: true,
                                                        bearing: null,
                                                        lat: res.content.station.pos.lat,
                                                        lng: res.content.station.pos.lng,
                                                        mapId: 'map',
                                                        ptich: null,
                                                        zoom: null});
                });
        }
    }, [direction, props.station]);

    return (
        <div className='station-events'>
            <div className='header'>
                <div className='back' onClick={() => {
                                            let tmp = [...props.subOverlayContent]; 
                                            tmp.pop(); 
                                            props.setSubOverlayContent(tmp);
                                            window.portEvents.pub('mapFitBounds', getStationCoords(props.displayedConnection));
                                        }}>
                    <i className='icon'>arrow_back</i></div>
                <div className='station'>{stationName}</div>
                <div className='event-type-picker'>
                    <div>
                        <input  type='radio' 
                                id='station-departures' 
                                name='station-event-types' 
                                value='DEP'
                                checked={displayDirection==='DEP'} 
                                onChange={(e) => setDisplayDirection(e.currentTarget.value)}/>
                        <label htmlFor='station-departures'>{props.translation.search.departure}</label>
                    </div>
                    <div>
                        <input  type='radio' 
                                id='station-arrivals' 
                                name='station-event-types' 
                                value='ARR'
                                checked={displayDirection==='ARR'}
                                onChange={(e) => setDisplayDirection(e.currentTarget.value)}/>
                        <label htmlFor='station-arrivals'>{props.translation.search.arrival}</label>
                    </div>
                </div>
            </div>
            <div className='events'>
                <div className=''>
                    <div className='extend-search-interval search-before' onClick={() => { onClickHandler(byScheduleTime, 'EARLIER', eventCount, stationID, minTime, eventStations, setEventStations, setMinTime, setMaxTime, setEventsToDisplay, props.translation, setLoadEarlier); setLoadEarlier(true) }}>
                        { loadEarlier ? 
                            <Spinner />
                            :
                            <a>{props.translation.connections.extendBefore}</a>
                        }
                    </div>
                    <div className='event-list'>
                        {(eventsToDisplay) ? stationEventDivGenerator(eventsToDisplay, props.translation, displayDirection, props.subOverlayContent, props.setSubOverlayContent, props.setTrainSelected) : <></>}
                    </div>
                    <div className='divider footer'></div>
                    <div className='extend-search-interval search-after' onClick={() => { onClickHandler(byScheduleTime, 'LATER', eventCount, stationID, maxTime, eventStations, setEventStations, setMinTime, setMaxTime, setEventsToDisplay, props.translation, setLoadLater); setLoadLater(true)}}>
                        {loadLater ? 
                            <Spinner />
                            :
                            <a>{props.translation.connections.extendAfter}</a>
                        }
                    </div>
                </div>
            </div>
        </div>
    );
}