@echo off
echo Installing WorkSphere Mobile dependencies...
cd /d %~dp0
call npm install @react-navigation/native@6 @react-navigation/stack@6 @react-navigation/bottom-tabs@6
call npm install react-native-screens react-native-safe-area-context
call npm install react-native-gesture-handler react-native-reanimated
call npm install react-native-mmkv
call npm install axios
echo Done!
pause
