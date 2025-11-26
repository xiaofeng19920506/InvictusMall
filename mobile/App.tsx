import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { AuthProvider } from "./src/contexts/AuthContext";
import { NotificationProvider } from "./src/contexts/NotificationContext";
import AppNavigator from "./src/navigation/AppNavigator";

const App: React.FC = () => {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NotificationProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </NotificationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

export default App;
