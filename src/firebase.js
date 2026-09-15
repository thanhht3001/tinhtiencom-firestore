// Cấu hình Firebase Web SDK. Đây KHÔNG phải secret — apiKey của Firebase Web SDK
// chỉ định danh project, không dùng để xác thực; bảo mật thật sự nằm ở
// Firestore Security Rules (firestore.rules) + Cloud Functions, an toàn khi commit.
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyBKO_LVJ5OaJQx4JiKJENjS6ECKSIKVy0c",
  authDomain: "tinhtiencom-1b041.firebaseapp.com",
  projectId: "tinhtiencom-1b041",
  storageBucket: "tinhtiencom-1b041.firebasestorage.app",
  messagingSenderId: "428360148635",
  appId: "1:428360148635:web:9edee1433e36789c65883e",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
// region phải khớp với region deploy Cloud Functions (đặt ở functions/index.js)
export const functions = getFunctions(app, "asia-southeast1");
