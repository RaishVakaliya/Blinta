import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Modal, TouchableOpacity, StyleSheet } from "react-native";

type PostMenuProps = {
  visible: boolean;
  onClose: () => void;
  onHide: () => void;
};

export default function PostMenu({ visible, onClose, onHide }: PostMenuProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={styles.overlay} onPress={onClose}>
        <View style={styles.menu}>
          <TouchableOpacity style={styles.menuItem} onPress={onHide}>
            <Ionicons name="eye-off-outline" size={24} color={COLORS.white} />
            <Text style={styles.menuText}>Hide posts from this user</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  menu: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 10,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  menuText: {
    color: COLORS.white,
    marginLeft: 10,
    fontSize: 16,
  },
});
