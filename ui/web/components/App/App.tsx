import React from 'react';

import { useRouter } from 'next/router';
import moment from 'moment';

import { Overlay } from '../Overlay/Overlay';
import { Translations, deTranslations, enTranslations, plTranslations } from './Localization';
import { StationSearch } from '../StationSearch/StationSearch';
import { MapContainer } from '../Map/MapContainer';
import { Interval } from '../Types/RoutingTypes';
import { elmAPIResponse } from '../Types/IntermodalRoutingTypes';
import { ScheduleInfoResponse } from '../Types/ScheduleInfo';
import { Station } from '../Types/Connection';
import { Address } from '../Types/SuggestionTypes';

declare global {
    interface Window {
        portEvents: any;
    }
}


const getQuery = (): Translations => {
    let router = useRouter();
    let { lang } = router.query;
    if (lang === 'de') {
        return deTranslations;
    } else if (lang === 'pl') {
        return plTranslations;
    }
    return enTranslations;
}


export const App: React.FC = () => {

    // Hold the available Interval for Scheduling Information
    const [scheduleInfo, setScheduleInfo] = React.useState<Interval>(null);

    const [stationEventTrigger, setStationEventTrigger] = React.useState<boolean>(false)

    const [station, setStation] = React.useState<Station | Address>({ id: '', name: '' });

    // Boolean used to decide if the SubOverlay is being displayed
    const [subOverlayHidden, setSubOverlayHidden] = React.useState<boolean>(true);

    // Current Date
    const [searchDate, setSearchDate] = React.useState<moment.Moment>(null);

    // Current hovered map Data
    const [mapData, setMapData] = React.useState<any>();

    let isMobile = false;

    React.useEffect(() => {
        window.portEvents.sub('mapSetTooltip', function(data){
            setMapData(data);
        });
    });

    React.useEffect(() => {
        isMobile = window.matchMedia("only screen and (max-width: 500px)").matches;
    }, []);

    React.useEffect(() => {
        let requestURL = 'https://europe.motis-project.de/?elm=requestScheduleInfo';

        fetch(requestURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: {}, content_type: 'MotisNoMessage', destination: { target: '/lookup/schedule_info', type: 'Module' } })
        })
            .then(res => res.json())
            .then((res: elmAPIResponse) => {
                console.log("Response came in");
                console.log(res);
                let intv = { begin: (res.content as ScheduleInfoResponse).begin, end: (res.content as ScheduleInfoResponse).end }
                let intvBegin = moment.unix(intv.begin);
                intvBegin.hour(moment().hour());
                intvBegin.minute(moment().minute());
                setScheduleInfo(intv);
            })
    }, []);

    React.useEffect(() => {
        if((station as Station).id !== ''){
            setStationEventTrigger(true);
            setSubOverlayHidden(false);
            console.log(station);
        }
    }, [station]);

    return (
        <div className='app'>
            {isMobile ?
                <Overlay translation={getQuery()} scheduleInfo={scheduleInfo} subOverlayHidden={subOverlayHidden} setSubOverlayHidden={setSubOverlayHidden} stationEventTrigger={stationEventTrigger} setStationEventTrigger={setStationEventTrigger} station={station} setStation={setStation} searchDate={searchDate} setSearchDate={setSearchDate}/>
                :
                <>
                    {/* visible && <MapView />*/}
                    <MapContainer translation={getQuery()} scheduleInfo={scheduleInfo} searchDate={searchDate} mapData={mapData}/>
                    <Overlay translation={getQuery()} scheduleInfo={scheduleInfo} subOverlayHidden={subOverlayHidden} setSubOverlayHidden={setSubOverlayHidden} stationEventTrigger={stationEventTrigger} setStationEventTrigger={setStationEventTrigger} station={station} setStation={setStation} searchDate={searchDate} setSearchDate={setSearchDate}/>
                    {//<StationSearchView />}
                    }<StationSearch translation={getQuery()} setStationEventTrigger={setStationEventTrigger} station={station} setStation={setStation} />
                </>
            }
        </div>
    );
};