import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import WarehouseScreen from '../screens/warehouse/WarehouseScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import OrderStatusScreen from '../screens/orders/OrderStatusScreen';

const Tab = createBottomTabNavigator();

const MainNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          let iconName: string;

          if (route.name === 'Warehouse') {
            iconName = 'inventory';
          } else if (route.name === 'Orders') {
            iconName = 'local-shipping';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          } else {
            iconName = 'help';
          }

          return <MaterialIcons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        headerShown: true,
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTintColor: '#000',
      })}>
      <Tab.Screen name="Warehouse" component={WarehouseScreen} />
      <Tab.Screen 
        name="Orders" 
        component={OrderStatusScreen}
        options={{
          title: 'Track Order',
        }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default MainNavigator;

