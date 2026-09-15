// Cấu hình Firebase Web SDK. Đây KHÔNG phải secret — apiKey của Firebase Web SDK
// chỉ định danh project, không dùng để xác thực; bảo mật thật sự nằm ở
// Firestore Security Rules (firestore.rules), vì không có backend ở giữa.
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

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
export const auth = getAuth(app);
