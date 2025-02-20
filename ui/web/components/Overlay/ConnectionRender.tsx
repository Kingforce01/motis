import React, { useEffect, useState } from 'react';

import moment from 'moment';
import equal from 'deep-equal';

import { Translations } from '../App/Localization';
import { getFromLocalStorage } from '../App/LocalStorage';

import { TransportInfo, Connection, Transport, WalkInfo, Stop, Trip, TripId, Station, Position } from '../Types/Connection';
import { Address } from '../Types/SuggestionTypes';

// returns the ID of given transport to determine the needed svg
export const classToId = (transport: Transport) => {
    switch (getClasz(transport)) {
        case 0:
            return '#plane';
        case 1:
            return '#train';
        case 2:
            return '#train';
        case 3:
            return '#bus';
        case 4:
            return '#train';
        case 5:
            return '#train';
        case 6:
            return '#train';
        case 7:
            return '#sbahn';
        case 8:
            return '#ubahn';
        case 9:
            return '#tram';
        case 11:
            return '#ship';
        case 'walk' || 'foot':
            return '#walk';
        case 'bike':
            return '#bike';
        case 'car':
            return '#car';
        default:
            return '#bus';
    }
}
// returns the accessibility number of given transport
const getAccNumber = (transport: Transport) => {
    if (transport.move_type === 'Walk') {
        let walkInfo = transport.move as WalkInfo;
        if (walkInfo.accessibility === 0) {
            return 'acc-0';
        } else if (walkInfo.accessibility < 30) {
            return 'acc-1';
        } else {
            return 'acc-2';
        }
    } else {
        return 'acc-0';
    }
}
// returns the clasz value of given transport to determine the class of connection
export const getClasz = (transport: Transport) => {
    switch (transport.move_type) {
        case 'Transport':
            return (transport.move as TransportInfo).clasz;
            break;
        case 'Walk':
            if ((transport.move as WalkInfo).mumo_type === '' || (transport.move as WalkInfo).mumo_type === 'foot') {
                return 'walk'
            }
            return (transport.move as WalkInfo).mumo_type;
            break;
        default:
            return '';
            break;
    }
}
// calculates all valid parts of a connection, calculated positions, lineEnds and partWidths are stored as GraphData objects
const calcPartWidths = (transports: Transport[], totalDurationInMill: number, stops: Stop[], totalWidth: number, destinationRadius: number) => {
    let partWidths: GraphData[] = [];
    //---constants from motis-project---
    let baseBarLength = 2;
    let avgCharLength = 7;
    let minWidth = 26;
    //----------------------------------
    let percentage = 0;
    let finalWidth = 0;
    let requiredWidth = 0;
    let availableWidth = totalWidth;
    let position = 0;
    let lineEnd = 0;
    let final = false;

    transports.map((t: Transport, index) => {
        if ((t.move_type === 'Transport') || ((index === 0 || index === transports.length - 1) && (t.move_type === 'Walk'))) { // valid parts are only TransportInfos or WalkInfos at the begining or ending
            let trainNameLength = (t.move_type === 'Transport') ? ((t.move as TransportInfo).name.length * avgCharLength) : 0;

            let transportTimeInMill = moment.unix(stops[t.move.range.to].arrival.time).diff(moment.unix(stops[t.move.range.from].departure.time));
            percentage = transportTimeInMill / totalDurationInMill;

            let partWidth = (percentage >= 1) ? totalWidth : ((percentage * totalWidth) + baseBarLength); // if percentage >= 1, it has to be a single connection, so the width is automatically the totalWidth, if not the partWidth is the proportion of the totalWidth

            finalWidth = Math.max(Math.max(trainNameLength, partWidth), minWidth); // in case the proportion is too short, there might be overlappings of trainName or icons so it has to be determined which is greatest of all three
            requiredWidth += finalWidth;
            if (finalWidth == minWidth) { // if either minWidth or trainNameLength was selected as finalWidth, the partWidth must be not changed further
                final = true;
                availableWidth -= minWidth;
            } else if (finalWidth == trainNameLength) {
                final = true;
                availableWidth -= trainNameLength;
            }
            lineEnd = position + finalWidth + (destinationRadius / 2);
            partWidths.push({ position: position, partWidth: finalWidth, lineEnd: lineEnd, percentage: percentage, final: final });
            position += finalWidth;
            final = false;
        }
    });

    if (totalWidth < requiredWidth) { // if the requiredWidth is wider, the parts have to be reduced, except the finals
        return calcFinalPartWidths(partWidths, availableWidth);
    } else if (totalWidth > requiredWidth) { // if requiredWidth is shorter, than each component has to be widened so it fills the graph
        let remainingWidth = totalWidth - requiredWidth;
        let tmp: GraphData[] = [];
        let newPosition = 0;
        partWidths.map((g: GraphData, index) => {
            let newWidth = g.partWidth + Math.ceil(g.percentage * remainingWidth); //adds the remaining width proportionally to the existing partWidth
            let newLineEnd = (newPosition + newWidth + (destinationRadius / 2));
            if (index == partWidths.length - 1 && newLineEnd < 323) {
                newLineEnd = 323;
            }
            tmp.push({ position: newPosition, partWidth: newWidth, lineEnd: newLineEnd, percentage: g.percentage, final: true });
            newPosition += newWidth;
        })
        return tmp;
    } else if (totalWidth == requiredWidth) {
        return partWidths;
    }
    return [];
}
// reduce all parts that are not final, so it wont overflow the bound of transportgraph
const calcFinalPartWidths = (partWidths: GraphData[], totalWidth: number) => {
    let newPartWidths: GraphData[] = [];
    let partWidthCopy = [...partWidths];
    let availableWidth = totalWidth;
    let requiredWidth = 0;
    let newPosition = 0;
    let allFinal = false;

    while (allFinal === false) { // while all parts are not final, repeat the calculation
        allFinal = true;
        newPartWidths = [];
        newPosition = 0;
        partWidthCopy.map((g: GraphData) => {
            if (g.final) { // if partWidth is final, do not modify and save as is
                newPartWidths.push({ position: newPosition, partWidth: g.partWidth, lineEnd: (newPosition + g.partWidth + 3), percentage: g.percentage, final: true });
                newPosition += g.partWidth;
                requiredWidth += g.partWidth;
            } else {
                let newWidth = g.percentage * availableWidth;
                let final = false;
                if (newWidth < 26) { // if the new width falls below the minWidth, set it to minWidth and final
                    newWidth = 26;
                    availableWidth -= 26;
                    final = true;
                    allFinal = false; // calculation has to be repeated
                }
                newPartWidths.push({ position: newPosition, partWidth: newWidth, lineEnd: (newPosition + newWidth + 3), percentage: g.percentage, final: final });
                newPosition += newWidth;
                requiredWidth += newWidth;
            }
        });
        if (requiredWidth <= 323) { // in case requiredWidth of newParts is less or equal to totalWidth of transportgraph break the while loop
            break;
        }
        partWidthCopy = newPartWidths;
    }
    if (requiredWidth < 323) { // if requiredWidth was reduced too much, widen it again proportionally
        let remainingWidth = 323 - requiredWidth;
        let tmp: GraphData[] = [];
        let newPosition = 0;
        newPartWidths.map((g: GraphData, index) => {
            let newWidth = g.partWidth + Math.ceil(g.percentage * remainingWidth); //adds the remaining width proportionally to the existing partWidth
            let newLineEnd = (newPosition + newWidth + 3);
            if (index == partWidths.length - 1 && newLineEnd !== 323) {
                newLineEnd = 323;
            }
            tmp.push({ position: newPosition, partWidth: newWidth, lineEnd: newLineEnd, percentage: g.percentage, final: true });
            newPosition += newWidth;
        });
        newPartWidths = tmp;
    }
    return newPartWidths;
}
// helperfunction get set highlightedpart based on mumoType from mapData
const convertedWalkNumber = (mumoType: string) => {
    switch (mumoType) {
        case 'car':
            return -1;
        case 'bike':
            return -2;
        case 'foot' || '':
            return -3;
        default:
            return -4;
    }
}


// Helperfunction used to identify Connections in ConnectionList when hovering Connection on Map or hovering in the list
const showTooltip = (toolTipSelected: number | {dep: Position, arr: Position}, trainNumber: number, partsHighlighted: (number | {dep: Position, arr: Position})[], depArr: {dep: Position, arr: Position}) => {
    if (trainNumber === undefined) {
        if (partsHighlighted.reduce((prev, cur) => equal(depArr, cur) || prev, false) || (toolTipSelected !== undefined && equal((toolTipSelected as {dep: Position, arr: Position}), depArr))) {
            return 'visible';
        }
    }
    if (
        // partsHighlighted contains all trainNumbers and Position tuples of Connections that are hovered right now.
        // If trainNumber is in this list, show this tooltip.
        (partsHighlighted.includes(trainNumber)) 
        || 
        (toolTipSelected !== undefined && 
            // Hovering ConnectionList sets Tooltip. If trainNumber is equal, then this connection has to show its tooltip
            (((toolTipSelected as number) === trainNumber)))) {
        return 'visible' 
    }
    return '';
}


interface PartElem {
    transport: Transport,
    graphData: GraphData,
    classId: string,
    trainName?: string,
    transportName?: string,
    clasz: (string | number),
    acc: string,
    trainNumber?: number
}

//stores the data needed for the transportgraph
interface GraphData {
    position: number,
    partWidth: number,
    lineEnd: number,
    percentage: number,
    final: boolean
}

export const ConnectionRender: React.FC<{ 'translation': Translations, 'connection': Connection, 'connectionHighlighted': boolean, 'mapData': any, 'parentIndex': number }> = (props) => {

    const [toolTipSelected, setToolTipSelected] = useState<number | {dep: Position, arr: Position}>(undefined);
    const [parts, setParts] = useState<PartElem[]>([]);
    // partsHighlighted stores all trainNumbers of highlighted parts coming from mapData
    const [partsHighlighted, setPartsHighlighted] = useState<(number | {dep: Position, arr: Position})[]>([]);
    const [start, setStart] = useState<Station | Address>(getFromLocalStorage('motis.routing.from_location'));
    const [destination, setDestination] = useState<Station | Address>(getFromLocalStorage('motis.routing.to_location'));
    // total Duration of this connection in Milliseconds
    let totalDurationInMill = moment.unix(props.connection.stops[props.connection.stops.length - 1].arrival.time).diff(moment.unix(props.connection.stops[0].departure.time));
    // variables from motis-project, not used ones are left out
    let iconSize = 16;
    let circleRadius = 12;
    let basePartSize = circleRadius * 2;
    let iconOffset = ((circleRadius * 2) - iconSize) / 2;
    let destinationRadius = 6;
    let textOffset = circleRadius * 2 + 4;
    let textHeight = 12;
    let totalHeight = textOffset + textHeight;
    let totalWidth = 335; // transportListViewWidth from Connections.elm
    let tooltipWidth = 240;

    // initial calculation for all needed part elements and graphdatas
    useEffect(() => {
        let p: PartElem[] = [];
        let g: GraphData[] = calcPartWidths(props.connection.transports, totalDurationInMill, props.connection.stops, totalWidth - (destinationRadius * 2), destinationRadius);
        let counter = 0;

        props.connection.transports.map((transport: Transport, index) => {
            let classId = classToId(transport);
            let clasz = getClasz(transport);
            let acc = getAccNumber(transport);
            let trainName = '';
            let transportName = '';
            if (transport.move_type === 'Transport') {
                trainName = (transport.move as TransportInfo).name;
            } else {
                switch ((transport.move as WalkInfo).mumo_type) {
                    case 'car':
                        transportName = props.translation.connections.car.toString();
                        break;
                    case 'bike':
                        transportName = props.translation.connections.bike.toString();
                        break;
                    default:
                        transportName = props.translation.connections.walk.toString();
                        break;
                }
            }
            if (transport.move_type === 'Transport') {
                p.push({ transport: transport, graphData: g[counter], classId: classId, trainName: trainName, clasz: clasz, acc: acc, trainNumber: (transport.move as TransportInfo).train_nr });
                counter += 1;
            } else if ((index === 0 || index === props.connection.transports.length - 1) && (transport.move_type === 'Walk')) {
                p.push({ transport: transport, graphData: g[counter], classId: classId, transportName: transportName, clasz: clasz, acc: acc });
                counter += 1;
            }
        })
        setParts(p);
    }, [])

    // everytime mapData changes its value and hovers over a connection line, all trainnumbers in the hovered segment will be stored 
    useEffect(() => {
        let tmp = [];
        if (props.mapData !== undefined && props.mapData.hoveredTripSegments !== null) {
            props.mapData.hoveredTripSegments.map((elem: any) => {
                tmp.push(elem.trip[0].train_nr);
            });
        }
        if (props.mapData !== undefined && props.connectionHighlighted && props.mapData.hoveredWalkSegment !== null) {
            tmp.push({dep: props.mapData.hoveredWalkSegment.walk.departureStation.pos, arr: props.mapData.hoveredWalkSegment.walk.arrivalStation.pos});
        }
        setPartsHighlighted(tmp);
    }, [props.mapData])


    return (
        <>
            <svg width={totalWidth} height={totalHeight} viewBox={`0 0 ${totalWidth} ${totalHeight}`}>
                <g>
                    {parts.map((partElem: PartElem) => (
                        <g className={`part train-class-${partElem.clasz} ${partElem.acc} ${(props.connectionHighlighted) ? ((partsHighlighted.includes(partElem.trainNumber) || partsHighlighted.includes({dep: props.connection.stops[partElem.transport.move.range.from].station.pos, arr: props.connection.stops[partElem.transport.move.range.to].station.pos})) ? 'highlighted' : 'faded') : ''}`} key={`${props.parentIndex}_${props.connection.stops[partElem.transport.move.range.from].departure.time}`}>
                            <line x1={partElem.graphData.position} y1={circleRadius} x2={partElem.graphData.lineEnd} y2={circleRadius} className='train-line'></line>
                            <circle cx={partElem.graphData.position + circleRadius} cy={circleRadius} r={circleRadius} className='train-circle' ></circle>
                            <use xlinkHref={partElem.classId} className='train-icon' x={partElem.graphData.position + iconOffset} y={iconOffset} width={iconSize} height={iconSize} ></use>
                            <text x={partElem.graphData.position} y={textOffset + textHeight} textAnchor='start' className='train-name'>{partElem.trainName}</text>
                            <rect x={partElem.graphData.position} y='0' width={partElem.graphData.position + partElem.graphData.partWidth} height={basePartSize} className='tooltipTrigger'
                                onMouseOver={() => { (partElem.trainNumber === undefined) ? setToolTipSelected({dep: props.connection.stops[partElem.transport.move.range.from].station.pos, arr: props.connection.stops[partElem.transport.move.range.to].station.pos}) : setToolTipSelected(partElem.trainNumber) }}
                                onMouseOut={() => { setToolTipSelected(undefined) }}></rect>
                        </g>
                    ))}
                </g>
                <g className='destination'><circle cx={totalWidth - destinationRadius} cy={circleRadius} r={destinationRadius}></circle></g>
            </svg>
            {parts.map((partElem: PartElem, index) => (
                <div className={`tooltip ${showTooltip(toolTipSelected, partElem.trainNumber, partsHighlighted, {dep: props.connection.stops[partElem.transport.move.range.from].station.pos, arr: props.connection.stops[partElem.transport.move.range.to].station.pos})}`} style={{ position: 'absolute', left: `${(Math.min(partElem.graphData.position, (totalWidth - tooltipWidth)))}px`, top: `${(textOffset - 5)}px` }} key={`tooltip${props.parentIndex}${index}`}>
                    <div className='stations'>
                        <div className='departure'>
                            <div className='station'>
                                {(props.connection.stops[partElem.transport.move.range.from].station.name === 'START') ? (start as Station).name : props.connection.stops[partElem.transport.move.range.from].station.name}
                            </div>
                            <div className='time'>
                                {moment.unix(props.connection.stops[partElem.transport.move.range.from].departure.time).format('HH:mm')}
                            </div>
                        </div>
                        <div className='arrival'>
                            <div className='station'>
                                {(props.connection.stops[partElem.transport.move.range.to].station.name === 'END') ? (destination as Station).name : props.connection.stops[partElem.transport.move.range.to].station.name}
                            </div>
                            <div className='time'>
                                {moment.unix(props.connection.stops[partElem.transport.move.range.to].arrival.time).format('HH:mm')}
                            </div>
                        </div>
                    </div>
                    <div className='transport-name'>
                        {(partElem.transport.move_type === 'Transport') ? partElem.trainName : partElem.transportName}
                    </div>
                </div>
            ))}
        </>
    );
};