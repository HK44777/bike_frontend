import PolylineDecoder from '@mapbox/polyline';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants'; // New import for project ID
import * as Device from 'expo-device'; // New import for device info
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications'; // New import for notifications
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform, // For custom buttons
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import MapView, { Marker, Polyline } from 'react-native-maps';

const OLA_API_KEY = 'CornDpxoVHMISlbCN8ePrPdauyrHDeIBZotfvRdy';
const YOUR_BACKEND_API_URL = 'http://192.168.149.213:5000'; // **Ensure this is your correct Flask backend URL**

// Set up notification handler for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true, // Set to true for sound
    shouldSetBadge: false,
  }),
});

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

  // New state for Expo Push Token
  const [expoPushToken, setExpoPushToken] = useState('');
  // Refs for notification listeners to clean them up later
  const notificationListener = useRef();
  const responseListener = useRef();

  // Utility function to register for push notifications and get the token
  const registerForPushNotificationsAsync = async () => {
    let token;

    if (Platform.OS === 'android') {
      // Create a notification channel for Android (required for Android 8.0+)
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      // Check existing permission status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permission if not already granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert('Permission Needed', 'Failed to get push token for push notifications! You might not receive updates.');
        return;
      }

      // Get the Expo Push Token for this device
      // Use Constants.expoConfig.projectId for bare workflow or EAS Build
      // For managed workflow (Expo Go), Constants.manifest.projectId might be used, but Constants.easConfig?.projectId is more robust.
      token = (await Notifications.getExpoPushTokenAsync({ projectId: Constants.easConfig?.projectId || Constants.manifest?.extra?.eas?.projectId })).data;
      console.log('Expo Push Token:', token);
    } else {
      // Alert if not on a physical device (simulators don't get push tokens)
      Alert.alert('Warning', 'Must use physical device for Push Notifications to work.');
    }

    return token;
  };

  // Function to send the Expo Push Token to your Flask backend
  const sendPushTokenToBackend = async (token) => {
    try {
      const username = await AsyncStorage.getItem('user_name'); // Get the current user's username
      if (!username) {
        console.warn("Username not found in AsyncStorage. Cannot send push token to backend.");
        return;
      }

      const response = await fetch(`${YOUR_BACKEND_API_URL}/api/save-push-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, token }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('Failed to save push token on backend:', data);
      } else {
        console.log('Push token successfully saved to backend:', data);
      }
    } catch (error) {
      console.error('Error sending push token to backend:', error);
    }
  };

  // --- useEffect for Push Notification Setup ---
  useEffect(() => {
    // 1. Register for push notifications and send token to backend
    registerForPushNotificationsAsync().then(token => {
      setExpoPushToken(token);
      if (token) {
        sendPushTokenToBackend(token);
      }
    });

    // 2. Set up listeners for incoming notifications
    // This listener is fired whenever a notification is received while the app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received (foreground):', notification);
      // You can add custom logic here, e.g., show a more custom alert or update UI
      Alert.alert(
        notification.request.content.title || 'Notification',
        notification.request.content.body || 'You received a notification.'
      );
    });

    // This listener is fired whenever a user taps on or interacts with a notification
    // (works when app is foregrounded, backgrounded, or killed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response received:', response);
      const { data } = response.notification.request.content;
      if (data && data.type === 'ride_stop_alert') {
        Alert.alert('Ride Stop Alert', 'A rider has requested to stop the ride. Please check details.');
        // You could navigate to a specific screen or update ride status based on this
      }
      // Add more specific handling based on notification data type
    });

    // Clean up listeners when the component unmounts
    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []); // Empty dependency array means this runs once on mount

  // --- Function to handle sending the Stop Notification ---
  const handleStopNotification = async () => {
    setLoading(true); // Show a temporary loading indicator
    try {
      const username = await AsyncStorage.getItem('user_name');
      if (!username) {
        Alert.alert('Error', 'Your username is not available. Cannot send stop notification.');
        setLoading(false);
        return;
      }

      // Send POST request to your backend to send stop notification
      const response = await fetch(`${YOUR_BACKEND_API_URL}/api/send-stop-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sender_username: username }),
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert('Notification Sent', data.message || 'Stop notification sent to other riders!');
      } else {
        Alert.alert('Error', data.error || 'Failed to send stop notification.');
      }
    } catch (error) {
      console.error('Error sending stop notification:', error);
      Alert.alert('Network Error', 'Failed to send stop notification due to a network issue.');
    } finally {
      setLoading(false);
    }
  };

  // --- Placeholder functions for other buttons ---
  const handleSOS = () => {
    Alert.alert('SOS', 'Sending emergency alert!');
    // Implement actual SOS logic here (e.g., send location to emergency contacts)
  };

  const handleInfo = () => {
    Alert.alert('Info', 'Displaying ride information.');
    // Implement logic to show detailed ride info
  };

  const handleThreeDots = () => {
    Alert.alert('More Options', 'Opening more ride options.');
    // Implement logic for more options (e.g., share ride, change destination)
  };


  // Existing useEffect for distance tracking
  useEffect(() => {
    if (!userLocation || !stepCoordinates.length) return;

    const getDistance = (lat1, lon1, lat2, lon2) => {
      const toRad = (value) => (value * Math.PI) / 180;
      const R = 6371e3; // metres
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

    console.log(
      `🚶 Step ${currentStepIndex + 1}/${stepCoordinates.length}`,
      `Distance to next step: ${dist.toFixed(2)} meters`
    );

    if (dist < 30 && currentStepIndex < stepCoordinates.length - 1) {
      console.log('✅ Reached step, moving to next step.');
      setCurrentStepIndex(prev => prev + 1);
    }

  }, [userLocation, stepCoordinates, currentStepIndex]);

  // Existing useEffect to load trip data from backend
  useEffect(() => {
    const loadTripData = async () => {
      try {
        setLoading(true);
        const username = await AsyncStorage.getItem('user_name');

        if (!username) {
          Alert.alert('Missing Data', 'Username not found in AsyncStorage. Please restart the app.');
          setLoading(false);
          return;
        }

        // ...
        const response = await fetch(`<span class="math-inline">\{YOUR\_BACKEND\_API\_URL\}/api/trips/</span>{username}`);
        const responseData = await response.json(); // <--- FIX: PARSE JSON *FIRST*

        if (!response.ok) { // Now 'responseData' *always* has the parsed JSON content
          Alert.alert('Trip Data Error', `Failed to load trip details: ${response.status} - ${responseData.error || 'Unknown error'}`);
          setLoading(false);
          return;
        }

        const tripData = responseData; 
        if (!tripData || !tripData.pickup || !tripData.destination) {
          Alert.alert('Trip Data Error', 'Could not load valid trip details for the given username. Pickup or Destination missing.');
          setLoading(false);
          return;
        }

        setPickup(tripData.pickup);
        setDestination(tripData.destination);
        setStops(tripData.stops || []);

      } catch (err) {
        console.error('Error loading trip data:', err);
        Alert.alert('Error', 'Failed to load trip information from the backend. Check network or server.');
        setLoading(false);
      }
    };

    loadTripData();
  }, []);

  // Existing useEffect for getting current user location
  useEffect(() => {
    const getCurrentLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location permission is required to track your position.');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (error) {
        console.error('Expo Location error:', error);
        Alert.alert('Error', 'Unable to fetch your current location.');
      }
    };

    getCurrentLocation();
  }, []);

  // Existing useEffect for traversed polyline
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

  // Existing useEffect to fetch route from Ola Maps API
  useEffect(() => {
    if (pickup && destination) {
      fetchRoute();
    }
  }, [pickup, destination, stops]);

  const fetchRoute = async () => {
    try {
      setLoading(true);
      if (!pickup || !destination) {
        Alert.alert('Error', 'Pickup or destination is not set. Cannot fetch route.');
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

      const coordinatesToFit = [pickup, destination, ...stops];
      if (mapRef.current && coordinatesToFit.length > 0) {
        mapRef.current.fitToCoordinates(coordinatesToFit.filter(Boolean), {
          edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
          animated: true,
        });
      }
    } catch (err) {
      console.error('❌ Error fetching route:', err);
      Alert.alert('API Error', 'Could not fetch route from Ola Maps.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loadingIndicator} />
      ) : (
        <MapView
          ref={mapRef}
          style={styles.map}
          onMapReady={() => {
            if (mapRef.current && pickup && destination) {
              const coordinatesToFit = [pickup, destination, ...stops];
              mapRef.current.fitToCoordinates(coordinatesToFit.filter(Boolean), {
                edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
                animated: true,
              });
            }
          }}
          showsUserLocation={true}
          followsUserLocation={true}
        >
          {pickup && <Marker coordinate={pickup} title="Pickup" pinColor="green" />}
          {destination && <Marker coordinate={destination} title="Destination" pinColor="red" />}
          {stops.map((stop, index) => (
            <Marker key={index} coordinate={stop} title={`Stop ${index + 1}`} pinColor="yellow" />
          ))}

          {traversedPolyline.length > 0 && (
            <Polyline
              coordinates={traversedPolyline}
              strokeColor="#A0A0A0"
              strokeWidth={4}
            />
          )}

          {routeData?.polyline && (
            <Polyline
              coordinates={routeData.polyline}
              strokeColor="#007AFF"
              strokeWidth={4}
              lineCap="round"
              lineJoin="round"
            />
          )}
        </MapView>
      )}

      {/* Top-Left Buttons */}
      {!loading && (
        <View style={styles.topLeftButtons}>
          <TouchableOpacity style={styles.iconButton} onPress={handleSOS}>
            <Text style={styles.iconButtonText}>SOS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleInfo}>
            <Text style={styles.iconButtonText}>Info</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Top-Right Buttons */}
      {!loading && (
        <View style={styles.topRightButtons}>
          <TouchableOpacity style={styles.iconButton} onPress={handleStopNotification}>
            <Text style={styles.iconButtonText}>Stop</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleThreeDots}>
            <Text style={styles.iconButtonText}>...</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Instructions Overlay */}
      {routeData?.instructions && (
        <View style={styles.instructionsContainer}>
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

      {/* Distance/Duration Overlay */}
      {!loading && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryText}>
            {Math.round(totalDuration / 60)} min • {totalDistance.toFixed(1)} km
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    flex: 1,
  },
  // --- New Styles for Buttons ---
  topLeftButtons: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20, // Adjust for iOS notch/status bar
    left: 10,
    flexDirection: 'column',
    gap: 10, // Space between buttons
    zIndex: 1, // Ensure buttons are above the map
  },
  topRightButtons: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20, // Adjust for iOS notch/status bar
    right: 10,
    flexDirection: 'column',
    gap: 10, // Space between buttons
    zIndex: 1, // Ensure buttons are above the map
  },
  iconButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // Semi-transparent white
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: 60, // Fixed width for consistent size
    height: 60, // Fixed height for consistent size
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  iconButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  // --- Existing Styles (renamed for clarity) ---
  instructionsContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 180 : 140, // Adjusted to be below new buttons
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
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
  },
  nextInstructionText: {
    color: '#eee',
    fontSize: 14,
    marginTop: 4,
  },
  summaryContainer: {
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
  },
  summaryText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
});

export default TravelScreen;