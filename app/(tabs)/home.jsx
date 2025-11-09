// app/home.jsx

import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert, // Import Alert for pop-up messages
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
const BASE_URL = "http://192.168.71.213:5000";
export default function Home() {
  const { userName: paramName } = useLocalSearchParams();
  const [userName, setUserName] = useState(paramName || "");
  const [isCurrentRideModalVisible, setIsCurrentRideModalVisible] = useState(false);
  const [hasActiveRide, setHasActiveRide] = useState(false); // State to track if user has an active ride

  // Function to check rider's active ride status from backend
  const checkRiderStatus = useCallback(async () => {
    if (!userName) {
      setHasActiveRide(false); // No username, so no active ride
      return;
    }
    try {
      // Fetch ride data for the current user from your Flask backend
      // This endpoint should return the rider's details, including 'ride_code'
      const response = await fetch(`${BASE_URL}/api/trips/${userName}`);
      const data = await response.json();

      // Check if the response was successful and if a ride_code exists
      if (response.ok && data.ride_code) {
        setHasActiveRide(true);
      } else {
        setHasActiveRide(false);
      }
    } catch (error) {
      console.error("Error checking rider status:", error);
      setHasActiveRide(false); // Assume no active ride on network/API error
    }
  }, [userName]); // Re-run this function if userName changes

  // Effect hook to load userName from AsyncStorage and then check ride status
  useEffect(() => {
    const loadUserNameAndCheckStatus = async () => {
      let currentUserName = paramName;
      if (!currentUserName) {
        const storedUserName = await AsyncStorage.getItem("user_name");
        if (storedUserName) {
          currentUserName = storedUserName;
          setUserName(storedUserName);
        }
      }
      // Only check ride status if a userName is available
      if (currentUserName) {
        checkRiderStatus();
      }
    };

    loadUserNameAndCheckStatus();
  }, [paramName, checkRiderStatus]); // Dependencies: paramName and the memoized checkRiderStatus

  const handleCreateRide = () => router.push("/create_ride");
  const handleJoinRide = () => router.push("/join_ride");

  // Logic for "Current Ride" button press
  const handleCurrentRide = () => {
    if (hasActiveRide) {
      // If user has an active ride, show the modal
      setIsCurrentRideModalVisible(true);
    } else {
      // If no active ride, show an alert
      Alert.alert('No Active Ride', 'You are not currently in any ride.');
    }
  };

  const clearAll = async () => {
  try {
    await AsyncStorage.clear();
    console.log('AsyncStorage fully cleared');
  } catch (e) {
    console.error('Failed to clear AsyncStorage', e);
  }
};
  const handleCloseModal = () => setIsCurrentRideModalVisible(false);
   const handleResumeRide = async () => {
    try {
      const storedUserName = await AsyncStorage.getItem('user_name');
      if (!storedUserName) {
        Alert.alert("Error", "User name not found. Cannot finish ride.");
        return;
      }
      const response = await fetch(`${BASE_URL}/api/update-ride-status/${storedUserName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "active", // Indicate that the ride is finished
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error finishing ride:", errorData);
        Alert.alert("Error", `Failed to finish ride: ${errorData.message || response.statusText}`);
        return;
      }
      router.push("/travel"); // Navigate back to home
      setIsCurrentRideModalVisible(false); // Close the modal
      checkRiderStatus(); // Re-check status to update the "Current Ride" button's state

    } catch (error) {
      console.error("Network error or issue during finish ride:", error);
      Alert.alert("Error", "An error occurred while finishing the ride. Please try again.");
    }
  };

  // Function to handle finishing a ride
  // This will send a POST request to your backend to set status to 'done' and clear ride data
  const handleFinishRide = async () => {
    try {
      const storedUserName = await AsyncStorage.getItem('user_name');
      if (!storedUserName) {
        Alert.alert("Error", "User name not found. Cannot finish ride.");
        return;
      }
      const response = await fetch(`${BASE_URL}/api/update-ride-status/${storedUserName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "done", // Indicate that the ride is finished
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error finishing ride:", errorData);
        Alert.alert("Error", `Failed to finish ride: ${errorData.message || response.statusText}`);
        return;
      }
      router.push("/home"); // Navigate back to home
      setIsCurrentRideModalVisible(false); // Close the modal
      checkRiderStatus(); // Re-check status to update the "Current Ride" button's state

    } catch (error) {
      console.error("Network error or issue during finish ride:", error);
      Alert.alert("Error", "An error occurred while finishing the ride. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          {`Good Morning ${userName}`}
        </Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity style={styles.button} onPress={handleCreateRide}>
          <Text style={styles.buttonText}>Create Ride</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleJoinRide}>
          <Text style={styles.buttonText}>Join Ride</Text>
        </TouchableOpacity>

        {/* "Current Ride" button: conditionally styled and disabled */}
        <TouchableOpacity
          style={[
            styles.button,
            !hasActiveRide && styles.disabledButton // Apply grey style if no active ride
          ]}
          onPress={handleCurrentRide}
          disabled={!hasActiveRide} // Disable button if no active ride
        >
          <Text style={styles.buttonText}>Current Ride</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={isCurrentRideModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalButton} onPress={handleResumeRide}>
              <Text style={styles.modalButtonText}>Resume Ride</Text>
            </TouchableOpacity>
            {/* Only "Finish Ride" option as requested */}
            <TouchableOpacity style={styles.modalButton} onPress={handleFinishRide}>
              <Text style={styles.modalButtonText}>Finish Ride</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelButton} onPress={handleCloseModal}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", alignItems: "center" },
  header: {
    width: "100%",
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    alignItems: "center",
  },
  headerText: {
    fontFamily: "Poppins",
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
  },
  content: {
    flex: 1,
    width: "100%",
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    backgroundColor: "#000",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 30,
    marginBottom: 20,
    elevation: 5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  // Style for disabled button (grey)
  disabledButton: {
    backgroundColor: "#a0a0a0",
  },
  modalContainer: {
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
    fontWeight: "600",
  },
  modalCancelButton: { marginTop: 20 },
  modalCancelText: { color: "#000", fontSize: 16 },
});