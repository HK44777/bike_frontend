import { Entypo, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import PolylineDecoder from '@mapbox/polyline';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

const { width, height } = Dimensions.get('window');

const OLA_API_KEY = 'CornDpxoVHMISlbCN8ePrPdauyrHDeIBZotfvRdy';
const BASE_URL = "http://192.168.71.213:5000"; // Ensure this IP is correct

const TravelScreen = () => {
  const [pickup, setPickup] = useState(null);
  const [destination, setDestination] = useState(null);
  const [stops, setStops] = useState([]);
  const [routeData, setRouteData] = useState(null);
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepCoordinates, setStepCoordinates] = useState([]);
  const [traversedPolyline, setTraversedPolyline] = useState([]);
  const mapRef = useRef(null);

  // --- State for Co-rider Locations (no direct rideCode state here) ---
  const [coworkerPickupLocations, setCoworkerPickupLocations] = useState([]);

  // --- Modal States ---
  const [isInfoModalVisible, setIsInfoModalVisible] = useState(false);
  const [activeInfoTab, setActiveInfoTab] = useState('rideInfo');
  const [activeRiders, setActiveRiders] = useState([]);


  const handleCurrentRide= () => setIsCurrentRideModalVisible(true);
  const handleCloseModal = () => setIsCurrentRideModalVisible(false);
  const handlePauseRide = async () => {
    // 1. Get the name from AsyncStorage
    userName = await AsyncStorage.getItem('user_name');

    const response = await fetch(`${BASE_URL}/api/update-ride-status/${userName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // 'Authorization': `Bearer YOUR_AUTH_TOKEN` // Include if your API requires it
      },
      body: JSON.stringify({
        status: "inactive",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error updating ride status:", errorData);
      alert(`Failed to pause ride: ${errorData.message || response.statusText}. Please try again.`);
      return;
    }

    // If the request was successful
    router.push("/home");
    setIsCurrentRideModalVisible(false);

  
};
  const handleFinishRide = async () => {
    // 1. Get the name from AsyncStorage
    userName = await AsyncStorage.getItem('user_name');

    const response = await fetch(`${BASE_URL}/api/update-ride-status/${userName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // 'Authorization': `Bearer YOUR_AUTH_TOKEN` // Include if your API requires it
      },
      body: JSON.stringify({
        status: "done",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error updating ride status:", errorData);
      alert(`Failed to pause ride: ${errorData.message || response.statusText}. Please try again.`);
      return;
    }

    // If the request was successful
    router.push("/home");
    setIsCurrentRideModalVisible(false);

  
};
  const [isCurrentRideModalVisible, setIsCurrentRideModalVisible] = useState(false);

  const EMERGENCY_NUMBER = '112';

  const handleSosPress = async () => {
    const phoneNumber = `tel:${EMERGENCY_NUMBER}`;
    try {
      const canOpen = await Linking.canOpenURL(phoneNumber);
      if (canOpen) {
        await Linking.openURL(phoneNumber);
        console.log(`Emergency call to ${EMERGENCY_NUMBER} initiated directly.`);
      } else {
        Alert.alert(
          'Call Failed',
          `Cannot make a call from this device. Please dial ${EMERGENCY_NUMBER} manually.`
        );
      }
    } catch (error) {
      console.error('Error attempting to make emergency call:', error);
      Alert.alert('Error', 'Could not initiate emergency call. Please try again.');
    }
  };

  const handleInfoPress = async () => {
    setIsInfoModalVisible(true);
    if (activeInfoTab === 'riders') {
      WorkspaceActiveRiders();
    }
  };

  const WorkspaceActiveRiders = useCallback(async () => {
    const username = await AsyncStorage.getItem('user_name'); // Directly get username
    if (!username) {
      console.warn("No username found in AsyncStorage to fetch active riders.");
      setActiveRiders([]);
      return;
    }

    try {
      // API call uses username directly
      const response = await fetch(`${BASE_URL}/api/riders/by_user/${username}`);
      const data = await response.json();

      if (response.ok && data.riders) {
        setActiveRiders(data.riders);
      } else {
        console.error("Failed to fetch active riders:", data.message || "Unknown error");
        setActiveRiders([]);
      }
    } catch (error) {
      console.error("Error fetching active riders:", error);
      setActiveRiders([]);
    }
  }, []); // No dependencies related to specific IDs/codes from state

  // --- New: Function to fetch co-rider pickup locations, using username ---
  const fetchCoworkerPickupLocations = useCallback(async () => {
    const username = await AsyncStorage.getItem('user_name'); // Get username again
    if (!username) {
      console.warn("No username found in AsyncStorage to fetch co-rider locations.");
      setCoworkerPickupLocations([]);
      return;
    }
    // setLoading(true); // You might want a separate loading state
    try {
      // API call now uses username
      const response = await fetch(`${BASE_URL}/api/ride/coworkers-pickup-locations/${username}`);
      const data = await response.json();

      if (response.ok && data.coworker_pickup_locations) {
        setCoworkerPickupLocations(data.coworker_pickup_locations);
      } else {
        console.error("Failed to fetch co-rider pickup locations:", data.error || "Unknown error");
        setCoworkerPickupLocations([]);
      }
    } catch (error) {
      console.error("Error fetching co-rider pickup locations:", error);
      Alert.alert("Network Error", "Could not fetch co-rider locations. Check your backend.");
      setCoworkerPickupLocations([]);
    } finally {
      // setLoading(false);
    }
  }, []); // No dependencies related to specific IDs/codes from state

  // --- Handle refresh button press ---
  const handleRefreshCoworkers = () => {
    console.log("Refresh button pressed. Fetching co-rider locations...");
    fetchCoworkerPickupLocations();
  };

  useEffect(() => {
    if (isInfoModalVisible && activeInfoTab === 'riders') {
      WorkspaceActiveRiders();
    }
  }, [activeInfoTab, isInfoModalVisible, WorkspaceActiveRiders]);

  useEffect(() => {
    if (!userLocation || !stepCoordinates.length) return;

    const getDistance = (lat1, lon1, lat2, lon2) => {
      const toRad = (value) => (value * Math.PI) / 180;
      const R = 6371e3;
      const φ1 = toRad(lat1);
      const φ2 = toRad(lat2);
      const Δφ = toRad(lat2 - lat1);
      const Δλ = toRad(lon2 - lon1);

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c;
    };

    const currentStep = stepCoordinates[currentStepIndex];
    if (!currentStep) return;

    const dist = getDistance(
      userLocation.latitude,
      userLocation.longitude,
      currentStep.latitude,
      currentStep.longitude
    );

    if (dist < 30 && currentStepIndex < stepCoordinates.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  }, [userLocation, stepCoordinates, currentStepIndex]);

  const formatDuration = (seconds) => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours} hr ${remainingMinutes > 0 ? `${remainingMinutes} min` : ''}`.trim();
    }
  };

  const fetchRoute = useCallback(async () => {
    try {
      setLoading(true);
      if (!pickup || !destination) {
        setLoading(false);
        return;
      }

      const waypoints = stops.length > 0
        ? `&waypoints=${stops.map(s => `${s.latitude},${s.longitude}`).join('|')}`
        : '';

      const url = `https://api.olamaps.io/routing/v1/directions?origin=${pickup.latitude},${pickup.longitude}&destination=${destination.latitude},${destination.longitude}${waypoints}&api_key=${OLA_API_KEY}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-Request-Id': 'ride-turn-by-turn',
        },
      });

      const json = await response.json();

      const route = json?.routes?.[0];
      if (!route?.overview_polyline) {
        Alert.alert('Route Error', 'No route found from Ola Maps API.');
        setLoading(false);
        return;
      }

      const decodedPolyline = PolylineDecoder.decode(route.overview_polyline).map(
        ([lat, lng]) => ({
          latitude: lat,
          longitude: lng,
        })
      );

      const totalDist = route.legs?.length
        ? route.legs.reduce((sum, leg) => sum + (leg.distance || 0), 0)
        : route.distance || 0;

      const totalDur = route.legs?.length
        ? route.legs.reduce((sum, leg) => sum + (leg.duration || 0), 0)
        : route.duration || 0;

      let allSteps = [];
      if (route.legs) {
        route.legs.forEach(leg => {
          if (leg.steps) {
            allSteps = allSteps.concat(leg.steps);
          }
        });
      }

      const instructions = allSteps.map((step) => ({
        instruction: step.instructions || 'Continue',
        distance: step.distance,
        duration: step.duration,
        location: {
          latitude: step.end_location.lat,
          longitude: step.end_location.lng,
        },
      }));

      setRouteData({ polyline: decodedPolyline, instructions });
      setStepCoordinates(instructions.map(step => step.location));
      setTotalDistance(totalDist / 1000);
      setTotalDuration(totalDur);

      const allRouteCoordinates = [
        pickup,
        destination,
        ...(stops || []),
        ...(decodedPolyline || [])
      ].filter(Boolean);

      setTimeout(() => {
        if (mapRef.current && allRouteCoordinates.length > 0) {
          mapRef.current.fitToCoordinates(allRouteCoordinates, {
            edgePadding: { top: 200, right: 80, bottom: 180, left: 80 },
            animated: true,
          });
        } else {
          console.warn("MapRef not available or no coordinates to fit.", { mapRefReady: !!mapRef.current, coordsCount: allRouteCoordinates.length });
        }
      }, 500);

    } catch (err) {
      console.error('❌ Error fetching route:', err);
      Alert.alert('API Error', 'Could not fetch route from Ola Maps.');
    } finally {
      setLoading(false);
    }
  }, [pickup, destination, stops]);

  // --- Load trip data from backend, using username directly ---
  useEffect(() => {
    const loadTripData = async () => {
      try {
        setLoading(true);
        const username = await AsyncStorage.getItem('user_name'); // Directly get username

        if (!username) {
          Alert.alert('Missing Data', 'Username not found in AsyncStorage. Please restart the app.');
          setLoading(false);
          return;
        }

        // API call uses username directly
        const response = await fetch(`${BASE_URL}/api/trips/${username}`);
        const tripData = await response.json();

        if (!response.ok || !tripData || !tripData.pickup || !tripData.destination) {
          Alert.alert('Trip Data Error', tripData.message || 'Could not load valid trip details for the given username. Pickup or Destination missing.');
          setLoading(false);
          return;
        }

        setPickup(tripData.pickup);
        setDestination(tripData.destination);
        setStops(tripData.stops || []);
        // No need to store ride_code in state here, as backend will derive it for co-riders
      } catch (err) {
        console.error('Error loading trip data:', err);
        Alert.alert('Error', 'Failed to load trip information from the backend. Check network or server.');
        setLoading(false);
      }
    };
    loadTripData();
  }, []); // Only runs once on mount, as no dependencies that change during active trip

  // --- Trigger fetchRoute when pickup/destination/stops change ---
  useEffect(() => {
    if (pickup && destination) {
      fetchRoute();
    }
  }, [pickup, destination, stops, fetchRoute]);

  // --- Fetch co-rider locations initially and when refreshed ---
  useEffect(() => {
    // This will run once when components mount and also when the refresh button calls it
    // The fetchCoworkerPickupLocations itself retrieves username from AsyncStorage
    fetchCoworkerPickupLocations();
  }, [fetchCoworkerPickupLocations]); // Depends on the function itself

  // --- Get current user location ---
  useEffect(() => {
    let subscription = null;
    const setupLocationTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location permission is required to track your position.');
          return;
        }

        const initialLocation = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: initialLocation.coords.latitude,
          longitude: initialLocation.coords.longitude,
        });

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000,
            distanceInterval: 10,
          },
          (newLocation) => {
            setUserLocation({
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
            });
          }
        );
      } catch (error) {
        console.error('Expo Location error:', error);
        Alert.alert('Error', 'Unable to fetch your current location.');
      }
    };

    setupLocationTracking();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  // --- Update traversed polyline based on user location ---
  useEffect(() => {
    if (!userLocation || !routeData?.polyline?.length) return;

    let closestIndex = 0;
    let minDist = Infinity;

    routeData.polyline.forEach((point, idx) => {
      const dist = Math.sqrt(
        Math.pow(point.latitude - userLocation.latitude, 2) +
        Math.pow(point.longitude - userLocation.longitude, 2)
      );
      if (dist < minDist) {
        minDist = dist;
        closestIndex = idx;
      }
    });

    const traversed = routeData.polyline.slice(0, closestIndex + 1);
    setTraversedPolyline(traversed);
  }, [userLocation, routeData]);

  const displayedDistanceTraveled = 0;
  const displayedAverageSpeed = 0;

  return (
    <View style={{ flex: 1 }}>
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ flex: 1 }} />
      ) : (
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          showsUserLocation={true}
          followsUserLocation={true}
        >
          {pickup && <Marker coordinate={pickup} title="Source" pinColor="green" />}
          {destination && <Marker coordinate={destination} title="Destination" pinColor="red" />}
          {stops.map((stop, index) => (
            <Marker key={index} coordinate={stop} title={`Stop ${index + 1}`} pinColor="yellow" />
          ))}
          {traversedPolyline.length > 0 && (
            <Polyline
              coordinates={traversedPolyline}
              strokeColor="#007AFF"
              strokeWidth={4}
            />
          )}
          {routeData?.polyline && (
            <Polyline
              coordinates={routeData.polyline}
              strokeColor="#007AFF"
              strokeWidth={4}
            />
          )}

          {/* Markers for Co-rider Pickup Locations */}
          {coworkerPickupLocations.map((location, index) => (
            <Marker
              key={`coworker-pickup-${index}`}
              coordinate={{ latitude: location.latitude, longitude: location.longitude }}
              title={location.username ? `${location.username}` : `Co-rider Pickup ${index + 1}`}
              pinColor="orange" // Orange pin as requested
            />
          ))}

        </MapView>
      )}

      {/* Instruction View (Top most) */}
      {routeData?.instructions && (
        <View style={styles.instructionView}>
          <Text style={styles.instructionText}>
            ➤ {routeData.instructions[currentStepIndex]?.instruction.replace(/<[^>]+>/g, '')}
          </Text>
          {routeData.instructions[currentStepIndex + 1] && (
            <Text style={styles.nextInstructionText}>
              Then {routeData.instructions[currentStepIndex + 1]?.instruction.replace(/<[^>]+>/g, '')}
            </Text>
          )}
        </View>
      )}

      {/* Top Left Buttons (SOS and Info) */}
      <View style={styles.topLeftButtons}>
        <TouchableOpacity style={[styles.circularButton, styles.sosButton]} onPress={handleSosPress}>
          <MaterialCommunityIcons name="alert-decagram" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.circularButton} onPress={handleInfoPress}>
          <Ionicons name="information-circle-outline" size={24} color="black" />
        </TouchableOpacity>
      </View>

      {/* Top Right Buttons (Stop and Three Dots) */}
      <View style={styles.topRightButtons}>
        <TouchableOpacity style={styles.circularButton} onPress={() => Alert.alert('Stop Trip', 'Are you sure you want to end the trip?')}>
          <Ionicons name="hand-right-outline" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.circularButton} onPress={handleCurrentRide}>
          <Entypo name="dots-three-vertical" size={24} color="black" />
        </TouchableOpacity>
      </View>

      {/* Modal for Info */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isInfoModalVisible}
        onRequestClose={() => setIsInfoModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Trip Information</Text>
              <TouchableOpacity onPress={() => setIsInfoModalVisible(false)}>
                <Ionicons name="close-circle-outline" size={30} color="gray" />
              </TouchableOpacity>
            </View>

            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, activeInfoTab === 'rideInfo' && styles.activeTabButton]}
                onPress={() => setActiveInfoTab('rideInfo')}
              >
                <Text style={[styles.tabButtonText, activeInfoTab === 'rideInfo' && styles.activeTabButtonText]}>Ride Info</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, activeInfoTab === 'riders' && styles.activeTabButton]}
                onPress={() => setActiveInfoTab('riders')}
              >
                <Text style={[styles.tabButtonText, activeInfoTab === 'riders' && styles.activeTabButtonText]}>Riders ({activeRiders.length})</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.tabContent}>
              {activeInfoTab === 'rideInfo' ? (
                <View>
                  <Text style={styles.infoText}>Average Speed: {displayedAverageSpeed} km/hr</Text>
                  <Text style={styles.infoText}>Estimated Duration: {formatDuration(totalDuration)}</Text>
                  <Text style={styles.infoText}>Distance Travelled: {displayedDistanceTraveled} km</Text>
                </View>
              ) : (
                <View>
                  {activeRiders.length > 0 ? (
                    activeRiders.map((rider, index) => (
                      <View key={rider.id || index} style={styles.riderItem}>
                        <Text style={styles.riderName}>{rider.name || `Rider ${index + 1}`}</Text>
                        <Text style={styles.riderStatus}>{rider.status || 'Active'}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.infoText}>No active riders found.</Text>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
              <Modal
                      visible={isCurrentRideModalVisible}
                      transparent
                      animationType="slide"
                      onRequestClose={handleCloseModal}
                    >
                      <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                          <TouchableOpacity style={styles.modalButton} onPress={handlePauseRide}>
                            <Text style={styles.modalButtonText}>Pause Ride</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.modalButton} onPress={handleFinishRide}>
                            <Text style={styles.modalButtonText}>Finish Ride</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.modalCancelButton} onPress={handleCloseModal}>
                            <Text style={styles.modalCancelText}>Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Modal>

      {/* Distance and Duration View (Bottom) */}
      {!loading && (
        <View style={styles.distanceDurationView}>
          <Text style={styles.distanceDurationText}>
            {formatDuration(totalDuration)} • {totalDistance.toFixed(1)} km
          </Text>
        </View>
      )}

      {/* Refresh Button (Bottom Left) */}
      <View style={styles.bottomLeftButton}>
        <TouchableOpacity style={styles.circularButton} onPress={handleRefreshCoworkers} disabled={loading}>
          <Ionicons name="refresh" size={20} color="black" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // ... (Your existing styles here) ...
  instructionView: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 5,
    zIndex: 10,
  },
  instructionText: {
    fontFamily: 'Poppins',
    color: 'white',
    fontSize: 16,
  },
  nextInstructionText: {
    fontFamily: 'Poppins',
    color: '#eee',
    fontSize: 14,
    marginTop: 4,
  },
  topLeftButtons: {
    position: 'absolute',
    top: 170,
    left: 10,
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 5,
  },
  topRightButtons: {
    position: 'absolute',
    top: 170,
    right: 10,
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 5,
  },
  circularButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 7,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 3,
  },
  sosButton: {
    backgroundColor: '#FF0000',
  },
  distanceDurationView: {
    position: 'absolute',
    bottom: 10,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 3,
    zIndex: 10,
  },
  distanceDurationText: {
    fontFamily: 'Poppins',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    maxHeight: '80%',
  },modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    elevation: 5,
  },
  modalButton: {
    backgroundColor: "#000",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 30,
    marginBottom: 10,
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "400",
  },
  modalCancelButton: { marginTop: 10},
  modalCancelText: { color: "#000", fontSize: 16 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins',
    fontWeight: 'bold',
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: 'black',
  },
  tabButtonText: {
    fontFamily: 'Poppins',
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
  },
  activeTabButtonText: {
    color: 'black',
  },
  tabContent: {
    width: '100%',
    paddingHorizontal: 10,
    maxHeight: '70%',
  },
  infoText: {
    fontFamily: 'Poppins',
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  infoTextSmall: {
    fontSize: 14,
    marginTop: 10,
    color: '#777',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  riderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  riderName: {
    fontFamily: 'Poppins',
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  riderStatus: {
    fontFamily: 'Poppins',
    fontSize: 14,
    color: 'black',
  },
  bottomLeftButton: {
    position: 'absolute',
    bottom: 100, // Adjust as needed
    left: 10,
    zIndex: 10,
  },
});

export default TravelScreen;