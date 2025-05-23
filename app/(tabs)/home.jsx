// app/home.jsx

import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function Home() {
  const { userName: paramName } = useLocalSearchParams();
  const [userName, setUserName] = useState(paramName || "");
  const [isCurrentRideModalVisible, setIsCurrentRideModalVisible] = useState(false);

  // If no param, load from AsyncStorage
  useEffect(() => {
    if (!paramName) {
      AsyncStorage.getItem("userName")
        .then(stored => stored && setUserName(stored))
        .catch(console.error);
    }
  }, []);

  const clearAll = async () => {
  try {
    await AsyncStorage.clear();
    console.log('AsyncStorage fully cleared');
  } catch (e) {
    console.error('Failed to clear AsyncStorage', e);
  }
};

  const handleCreateRide = () => router.push("/create_ride");
  const handleJoinRide   = () => router.push("/join_ride");
  const handleCurrentRide= () => setIsCurrentRideModalVisible(true);
  const handleCloseModal = () => setIsCurrentRideModalVisible(false);
  const handleResumeRide = () => { router.push("/resume_ride"); setIsCurrentRideModalVisible(false); };
  const handleFinishRide = () => { router.push("/finish_ride"); setIsCurrentRideModalVisible(false); };
  
  const clearEverything = async () => {
    try {
      await AsyncStorage.clear();
      Alert.alert('Success', 'All storage cleared');
    } catch (e) {
      Alert.alert('Error', 'Could not clear storage');
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

        <TouchableOpacity style={styles.button} onPress={clearAll}>
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
