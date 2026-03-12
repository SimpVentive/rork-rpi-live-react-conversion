import React, { useCallback } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import RNSlider from '@react-native-community/slider';

interface SliderProps {
  value: number;
  min: number;
  max: number;
  onValueChange: (val: number) => void;
  trackColor?: string;
}

function SliderInner({ value, min, max, onValueChange, trackColor = '#60a5fa' }: SliderProps) {
  const handleChange = useCallback((val: number) => {
    onValueChange(Math.round(val));
  }, [onValueChange]);

  return (
    <View style={styles.container}>
      <RNSlider
        style={styles.slider}
        value={value}
        minimumValue={min}
        maximumValue={max}
        step={1}
        onValueChange={handleChange}
        minimumTrackTintColor={trackColor}
        maximumTrackTintColor="#1e293b"
        thumbTintColor={trackColor}
      />
    </View>
  );
}

export default React.memo(SliderInner);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: 32,
    justifyContent: 'center',
  },
  slider: {
    width: '100%',
    height: Platform.OS === 'web' ? 28 : 32,
  },
});
