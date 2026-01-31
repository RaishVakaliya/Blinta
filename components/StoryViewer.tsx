import {
  View,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Text,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { COLORS } from "@/constants/theme";
import { styles as feedStyles } from "@/styles/feed.styles";
import type { StoryData } from "./Stories";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface StoryViewerProps {
  visible: boolean;
  story: StoryData | null;
  onClose: () => void;
}

export default function StoryViewer({
  visible,
  story,
  onClose,
}: StoryViewerProps) {
  const [showMenu, setShowMenu] = useState(false);

  const mutedUsers = useQuery(api.stories.getMutedUsers);
  const toggleMuteUser = useMutation(api.stories.toggleMuteUser);

  const isMuted =
    !!story &&
    (mutedUsers ?? []).some((id) => id === (story.userId as Id<"users">));

  useEffect(() => {
    if (!visible || !story) return;

    setShowMenu(false);
    const timer = setTimeout(() => {
      onClose();
      // 14 seconds
    }, 14000);

    return () => clearTimeout(timer);
  }, [visible, story, onClose]);

  if (!story) return null;

  const handleToggleMute = async () => {
    if (!story) return;
    try {
      await toggleMuteUser({ mutedUserId: story.userId as Id<"users"> });
      setShowMenu(false);
    } catch (err) {
      console.error("Error toggling story mute:", err);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={feedStyles.modalBackdrop}>
          <TouchableWithoutFeedback>
            <View style={{ flex: 1 }}>
              {/* Header */}
              <View
                style={{
                  paddingTop: 40,
                  paddingHorizontal: 16,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: COLORS.white,
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  {story.username}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  {!story.isCurrentUser && (
                    <TouchableOpacity
                      onPress={() => setShowMenu((prev) => !prev)}
                    >
                      <Ionicons
                        name="ellipsis-vertical"
                        size={22}
                        color={COLORS.white}
                      />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={onClose}>
                    <Ionicons name="close" size={24} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Story content */}
              <View style={{ flex: 1, justifyContent: "center" }}>
                <Image
                  source={story.imageUrl}
                  style={{ width: "100%", height: "80%" }}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                />
              </View>

              {showMenu && (
                <View
                  style={{
                    position: "absolute",
                    top: 85,
                    right: 16,
                    backgroundColor: COLORS.surface,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                  }}
                >
                  <TouchableOpacity onPress={handleToggleMute}>
                    <Text style={{ color: COLORS.white }}>
                      {isMuted
                        ? "Unhide stories from this user"
                        : "Hide stories from this user"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
