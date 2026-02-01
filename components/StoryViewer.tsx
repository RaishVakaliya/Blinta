import {
  View,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Text,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";
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
  const viewStory = useMutation(api.stories.viewStory);
  const storyViews = useQuery(
    api.stories.getStoryViews,
    story ? ({ storyId: story._id as Id<"stories"> } as any) : "skip",
  ) as
    | {
        count: number;
        viewers: {
          _id: string;
          username: string;
          fullname: string;
          image: string;
        }[];
      }
    | undefined;

  const userStories = useQuery(
    api.stories.getUserStories,
    story ? ({ userId: story.userId as Id<"users"> } as any) : "skip",
  ) as { _id: string; imageUrl: string; createdAt: number }[] | undefined;

  const [currentIndex, setCurrentIndex] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;

  const segments =
    userStories && userStories.length > 0
      ? userStories
      : story
        ? [
            {
              _id: story._id,
              imageUrl: story.imageUrl,
              createdAt: story.createdAt,
            },
          ]
        : [];

  const activeStory = segments[currentIndex] ?? segments[0];

  const isMuted =
    !!story &&
    (mutedUsers ?? []).some((id) => id === (story.userId as Id<"users">));

  useEffect(() => {
    if (!visible || !story || segments.length === 0 || !activeStory) return;

    // initialise index when stories change
    const initialIndex = segments.findIndex((s) => s._id === story._id);
    setCurrentIndex(initialIndex >= 0 ? initialIndex : 0);
  }, [visible, story?._id, userStories?.length]);

  useEffect(() => {
    if (!visible || !story || segments.length === 0 || !activeStory) return;

    setShowMenu(false);

    // record view for non-self stories
    if (!story.isCurrentUser) {
      viewStory({ storyId: activeStory._id as Id<"stories"> }).catch((err) => {
        console.error("Error recording story view:", err);
      });
    }

    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 14000,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (!finished) return;
      if (currentIndex < segments.length - 1) {
        setCurrentIndex((idx) => idx + 1);
      } else {
        onClose();
      }
    });

    return () => {
      animation.stop();
    };
  }, [visible, story?.userId, activeStory?._id, segments.length, currentIndex]);

  if (!story || segments.length === 0) return null;

  const handleToggleMute = async () => {
    try {
      await toggleMuteUser({ mutedUserId: story.userId as Id<"users"> });
      setShowMenu(false);
    } catch (err) {
      console.error("Error toggling story mute:", err);
    }
  };

  const calcTimeLabel = () => {
    const diffMs = Date.now() - activeStory.createdAt;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffHours >= 1) return `${diffHours}h`;
    return `${Math.max(1, diffMinutes)}m`;
  };

  const timeLabel = calcTimeLabel();

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
              {/* Progress bar */}
              <View
                style={{
                  paddingTop: 32,
                  paddingHorizontal: 8,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {segments.map((seg, index) => {
                    const isCurrent = index === currentIndex;
                    const isPast = index < currentIndex;
                    const width = isPast
                      ? "100%"
                      : isCurrent
                        ? (progress as any).interpolate({
                            inputRange: [0, 1],
                            outputRange: ["0%", "100%"],
                          })
                        : "0%";
                    return (
                      <View
                        key={seg._id}
                        style={{
                          flex: 1,
                          height: 2,
                          backgroundColor: "rgba(255,255,255,0.3)",
                          overflow: "hidden",
                          borderRadius: 999,
                        }}
                      >
                        <Animated.View
                          style={{
                            height: "100%",
                            width,
                            backgroundColor: COLORS.white,
                          }}
                        />
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Header */}
              <View
                style={{
                  paddingTop: 8,
                  paddingHorizontal: 16,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Image
                    source={story.avatar}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      marginRight: 8,
                    }}
                    contentFit="cover"
                  />
                  <Text
                    style={{
                      color: COLORS.white,
                      fontSize: 16,
                      fontWeight: "600",
                    }}
                  >
                    {story.username}
                  </Text>
                  <Text
                    style={{
                      color: COLORS.grey,
                      marginLeft: 8,
                      fontSize: 12,
                    }}
                  >
                    {timeLabel}
                  </Text>
                </View>

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
                  source={activeStory.imageUrl}
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
                    top: 70,
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

              {story.isCurrentUser && storyViews && (
                <View
                  style={{
                    position: "absolute",
                    bottom: 40,
                    left: 16,
                    right: 16,
                  }}
                >
                  <Text
                    style={{
                      color: COLORS.white,
                      fontWeight: "600",
                      marginBottom: 8,
                    }}
                  >
                    {storyViews.count} view
                    {storyViews.count === 1 ? "" : "s"}
                  </Text>
                  {storyViews.viewers.map((viewer) => (
                    <View
                      key={viewer._id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: 4,
                      }}
                    >
                      <Image
                        source={viewer.image}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          marginRight: 8,
                        }}
                        contentFit="cover"
                        transition={200}
                      />
                      <View>
                        <Text style={{ color: COLORS.white }}>
                          {viewer.fullname || viewer.username}
                        </Text>
                        <Text style={{ color: COLORS.grey, fontSize: 12 }}>
                          @{viewer.username}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
