import './HomePage.css';
import Map, { MapLayerMouseEvent, useMap } from "react-map-gl";
import { useEffect, useState } from "react";
import { SpinnerLoading } from "../Utils/SpinnerLoading"
import { useAuth0 } from "@auth0/auth0-react";
import { ControlPanel } from './ControlPanel';
import { VehicleIcon } from './VehicleIcon';
import { VehicleDisplay } from '../../models/VehicleDisplay';
import { VehicleState } from '../../models/VehicleState';
import { MapWrapper } from '../Utils/MapWrapper';

export const HomePage = () => {
    const { getAccessTokenSilently } = useAuth0();

    const { homePageMap } = useMap();

    const [token, setToken] = useState("");

    const mapboxToken = process.env.REACT_APP_MAPBOX_TOKEN!;
    const mapboxMapStyle = process.env.REACT_APP_MAPBOX_MAP_STYLE!;

    const [circleRadius, setCircleRadius] = useState(5);
    const [isMapLoaded, setIsMapLoaded] = useState(false);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [vehicleStateList, setVehicleStateList] = useState<VehicleState[]>([]);
    const [vehicleDisplayMap, setVehicleDisplayMap] = useState<MapWrapper<string, VehicleDisplay>>();

    const [count, setCount] = useState(0);

    // Vehicle dimensions controls - maybe move to configurables?
    const MIN_RADIUS = 5.0;     // Smallest vehicle circle radius
    const MAX_RADIUS = 120.0;   // Largest vehicle circle radius
    const MIN_ZOOM = 15.0;      // Zoom level at which vehicle size sticks at minimum
    const MAX_ZOOM = 22.0;      // Zoom level at which vehicle size sticks at maximum

    // Millisecond duration between frame redraws
    const MS_FRAME_TIME = 500;

    useEffect(() => {
        if (token) {
            return;
        }

        const audience = process.env.REACT_APP_AUTH0_AUDIENCE;
        getAccessTokenSilently({
            authorizationParams: {
                audience: audience,
            }
        })
            .then(async token => {
                setToken(token);
            });
    }, [token, getAccessTokenSilently]);

    useEffect(() => {
        if (vehicleDisplayMap) {
            return;
        }

        setVehicleDisplayMap(new MapWrapper<string, VehicleDisplay>());
    }, [vehicleDisplayMap]);

    function fetchVehicleStateList() {
        if (!token || token.length === 0) {
            return;
        }
        if (!isMapLoaded) {
            return;
        }

        try {
            // Get the latest VehicleStates
            const restUrlBase = process.env.REACT_APP_ROADRUNNER_REST_URL_BASE!;
            const getStatesUrl: string = `${restUrlBase}/api/vehicle/get-all-vehicle-states`;
            fetch(getStatesUrl, {
                method: 'get',
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            })
                .then(async response => response.json())
                .then(data => {
                    setVehicleStateList(data);
                    setIsDataLoaded(true);
                    data.map((vehicleState: VehicleState) => {
                        if (!vehicleDisplayMap?.get(vehicleState.id)) {
                            let vehicleDisplay = new VehicleDisplay(circleRadius, false, false);
                            vehicleDisplayMap?.set(vehicleState.id, vehicleDisplay);
                        }
                        return vehicleState;
                    })
                })
                .catch(error => {
                    //console.log(`Error caught during fetch in fetchVehicleStateList: ${error.message}`);
                    setIsDataLoaded(false);
                    return <></>;
                });
        }
        catch (error: any) {
            console.log(`Error caught in fetchVehicleStateList: ${error.message}`);
            setIsDataLoaded(false);
        }
    }

    function hideAllRoutes() {
        vehicleStateList.forEach((vehicleState) => {
            let vehicleDisplay = vehicleDisplayMap?.get(vehicleState.id);
            if (vehicleDisplay) {
                vehicleDisplay.popupVisible = false;
                vehicleDisplay.routeVisible = false;
            }
        })
    }

    function showAllRoutes() {
        vehicleStateList.forEach((vehicleState) => {
            let vehicleDisplay = vehicleDisplayMap?.get(vehicleState.id);
            if (vehicleDisplay) {
                vehicleDisplay.popupVisible = true;
                vehicleDisplay.routeVisible = true;
            }
        })
    }

    function onZoom(viewStateChangeEvent: { viewState: any; }) {
        let viewState = viewStateChangeEvent.viewState;
        let currentZoom = viewState.zoom;
        let radius = MIN_RADIUS;
        if (currentZoom < MIN_ZOOM) {
            radius = MIN_RADIUS;
        }
        else if (currentZoom > MAX_ZOOM) {
            radius = MAX_RADIUS;
        }
        else {
            radius = (MAX_RADIUS * Math.pow((2.0 / 3.0), (MAX_ZOOM - currentZoom)));
        }

        if (radius < 0) {
            radius = MIN_RADIUS;
        }

        // console.log(`Zoom is ${currentZoom}; Setting circle radius to ${radius}`)
        setCircleRadius(radius);
    }

    function onClick(event: MapLayerMouseEvent) {
        let bestVehicle: VehicleDisplay | undefined = {} as VehicleDisplay;
        let bestDistance = 100;
        vehicleStateList.forEach((vehicleState) => {
            let point = homePageMap?.project({ lng: vehicleState.degLongitude, lat: vehicleState.degLatitude });

            // Calculate the distance of the click from the vehicle
            if (point) {
                let xDelta = point.x - event.point.x;
                let yDelta = point.y - event.point.y;
                let distance = Math.sqrt(xDelta * xDelta + yDelta * yDelta);

                // If the distance is less than 50, then toggle visibility
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestVehicle = vehicleDisplayMap?.get(vehicleState.id);
                }
            }
        })
        if (bestVehicle) {
            bestVehicle.routeVisible = !bestVehicle.routeVisible;
            bestVehicle.popupVisible = !bestVehicle.popupVisible;
        }
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            try {
                fetchVehicleStateList();
                setCount(count + 1);    // Update count to trigger effect again
            }
            catch (error: any) {
                console.log(`Error caught in fetchVehicleStateList: ${error.message}`);
                setIsDataLoaded(false);
            }
        }, MS_FRAME_TIME)
        return () => clearTimeout(timer);
        // eslint-disable-next-line        
    }, [count]);

    return (
        <div className="body row scroll-y">
            <Map
                id="homePageMap"
                mapStyle={mapboxMapStyle}
                mapboxAccessToken={mapboxToken}
                onLoad={() => setIsMapLoaded(true)}
                initialViewState={{
                    longitude: -97.5,
                    latitude: 32.75,
                    zoom: 10,
                }}
                onClick={(event) => onClick(event)}
                onZoom={(viewStateChangeEvent) => onZoom(viewStateChangeEvent)}
            >
                {isDataLoaded ?
                    <>
                        <ControlPanel
                            vehicleStateList={vehicleStateList}
                            hideAllRoutes={hideAllRoutes}
                            showAllRoutes={showAllRoutes}
                        />
                        {vehicleStateList && (vehicleStateList.length > 0) && (
                            // eslint-disable-next-line
                            vehicleStateList.map((vehicleState) => {
                                let vehicleDisplay = vehicleDisplayMap?.get(vehicleState.id);
                                if (vehicleDisplay) {
                                    vehicleDisplay.circleRadius = circleRadius;
                                    return <VehicleIcon
                                        key={vehicleState.id}
                                        vehicleState={vehicleState}
                                        vehicleDisplay={vehicleDisplay} />
                                }
                            })
                        )}
                    </>
                    :
                    <div>
                        <SpinnerLoading />
                    </div>
                }
            </Map>
        </div>
    )
}
