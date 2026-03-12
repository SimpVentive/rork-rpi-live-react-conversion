import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@/components/Slider';

interface WeightSliderProps {
  label: string;
  value: number;
  color: string;
  onValueChange: (val: number) => void;
  max?: number;
}

function WeightSliderInner({ label, value, color, onValueChange, max = 98 }: WeightSliderProps) {
  const handleChange = useCallback((val: number) => {
    onValueChange(Math.round(val));
  }, [onValueChange]);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <View style={[styles.colorDot, { backgroundColor: color }]} />
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
      </View>
      <View style={styles.sliderRow}>
        <Slider
          value={value}
          min={0}
          max={max}
          onValueChange={handleChange}
          trackColor={color}
        />
        <Text style={[styles.value, { color }]}>{value}</Text>
      </View>
    </View>
  );
}

export const WeightSlider = React.memo(WeightSliderInner);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0d1835',
    borderWidth: 1,
    borderColor: '#1e4a7f',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#93c5fd',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  value: {
    fontSize: 18,
    fontWeight: '900',
    minWidth: 32,
    textAlign: 'right' as const,
  },
});
