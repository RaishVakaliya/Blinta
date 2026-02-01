import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, Text } from "react-native";

type AnimatedGradientTextProps = {
  text: string;
  textStyle?: object;
};

const AnimatedGradientText = ({
  text,
  textStyle,
}: AnimatedGradientTextProps) => {
  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animation, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: false,
        }),
        Animated.timing(animation, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, []);

  const color1 = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ["#89F9C5", "#085A34"],
  });

  const color2 = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ["#1F5F2A", "#6BE57F"],
  });

  const color3 = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ["#70E2EF", "#19646C"],
  });

  return (
    <MaskedView
      maskElement={
        <Text style={[textStyle, { backgroundColor: "transparent" }]}>
          {text}
        </Text>
      }
    >
      <AnimatedLinearGradient
        colors={[color1, color3, color2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ width: 200, height: 40 }}
      />
    </MaskedView>
  );
};

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default AnimatedGradientText;
