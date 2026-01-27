import { COLORS } from "@/constants/theme";
import { styles } from "@/styles/auth.styles";
import { useSSO } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { View, Text, Image, TouchableOpacity } from "react-native";

export default function login() {
  const { startSSOFlow } = useSSO();
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
      });
      if (setActive && createdSessionId) {
        setActive({ session: createdSessionId });
        router.replace("../(tabs)");
      }
    } catch (error) {
      console.error("OAuth error:", error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.brandSection}>
        <View>
          <Image
            source={require("../../assets/images/2.png")}
            style={styles.logoImage}
          />
        </View>
        <Text style={styles.appName}>Blinta</Text>
        <Text style={styles.tagline}>Don't Miss Anything</Text>
        <Text style={styles.tagline}>Be Simple, Be Social</Text>
      </View>

      <View style={styles.illustrationContainer}>
        <Image
          source={require("../../assets/images/auth-bg-1.png")}
          style={styles.illustration}
          resizeMode="cover"
        />

        {/*Login section */}
        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleSignIn}
          activeOpacity={0.9}
        >
          <View style={styles.googleIconContainer}>
            <Image
              source={require("../../assets/images/google-color.png")}
              style={{ width: 20, height: 20 }}
            />
          </View>
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        <Text style={styles.termsText}>
          By continuing, you agree to our Terms and Privacy Policy
        </Text>
      </View>
    </View>
  );
}
