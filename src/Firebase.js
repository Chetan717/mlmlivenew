// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB8i48UiJ9YJ1w9_e-cwthvbqB94eNLulc",
  authDomain: "mlmbooster-a4887.firebaseapp.com",
  projectId: "mlmbooster-a4887",
  storageBucket: "mlmbooster-a4887.firebasestorage.app",
  messagingSenderId: "535257539526",
  appId: "1:535257539526:web:13cbba2f093fcf277088c7",
  measurementId: "G-YB76LFZQ5X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const db = getFirestore(app);
const analytics = getAnalytics(app);

// Export
export { db, app, analytics };
