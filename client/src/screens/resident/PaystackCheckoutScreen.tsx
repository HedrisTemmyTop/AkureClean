import React, { useState, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { WebView, WebViewNavigation } from "react-native-webview";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { ResidentStackParamList } from "../../navigation/RoleNavigator";
import { paystackService } from "../../services/paystackService";
import { theme } from "../../theme";
import { AppText } from "../../components/AppText";

type PaystackCheckoutRouteProp = RouteProp<
  ResidentStackParamList,
  "PaystackCheckout"
>;

// A dummy URL to detect when payment is complete
const CALLBACK_URL = "https://akureclean.com/payment-success";

export const PaystackCheckoutScreen: React.FC = () => {
  const route = useRoute<PaystackCheckoutRouteProp>();
  const navigation = useNavigation();
  const { amount, metadata, onSuccess, onCancel } = route.params;

  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const initializePayment = async () => {
      try {
        const response = await paystackService.initialize(
          amount,
          metadata,
          CALLBACK_URL,
        );
        setAuthUrl(response.authorizationUrl);
      } catch (error: any) {
        console.error("Paystack Init Error:", error);
        const message =
          error.response?.data?.message || "Could not initialize payment.";
        Alert.alert("Error", message);
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    initializePayment();
  }, [amount, metadata]);

  const handleNavigationStateChange = async (state: WebViewNavigation) => {
    const { url } = state;
    console.log("WebView Navigating to:", url);

    // Guard against multiple calls
    if (verifying) return;

    if (url.includes(CALLBACK_URL) || url.includes("checkout/done")) {
      setVerifying(true);

      // Extract reference from URL (Paystack appends ?reference=... or ?trxref=...)
      const referenceMatch = url.match(/[?&](reference|trxref)=([^&]+)/);
      const reference = referenceMatch ? referenceMatch[2] : null;

      if (reference) {
        try {
          console.log("[Paystack] Verifying transaction:", reference);
          await paystackService.verify(reference);
          onSuccess();
          navigation.goBack();
        } catch (error) {
          console.error("Verification Error:", error);
          Alert.alert(
            "Payment Error",
            "Could not verify payment. Contact support.",
          );
          navigation.goBack();
        }
      } else {
        // Fallback for edge cases where URL matched but reference is missing
        onSuccess();
        navigation.goBack();
      }
      return;
    }

    if (url.includes("checkout/cancel") || url.includes("cancel")) {
      onCancel();
      navigation.goBack();
    }
  };

  if (loading || verifying) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <AppText style={{ marginTop: 16 }}>
          {verifying
            ? "Verifying payment status..."
            : "Connecting to Secure Payment Gateway..."}
        </AppText>
      </View>
    );
  }

  if (!authUrl) return null;

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: authUrl }}
        onNavigationStateChange={handleNavigationStateChange}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.webviewLoader}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
  webviewLoader: {
    position: "absolute",
    height: "100%",
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});
