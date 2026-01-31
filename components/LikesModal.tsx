import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { View, Text, Modal, TouchableOpacity, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Loader } from "./Loader";
import { styles } from "@/styles/feed.styles";
import { COLORS } from "@/constants/theme";
import { Image } from "expo-image";

type LikesModalProps = {
  postId: Id<"posts">;
  visible: boolean;
  onClose: () => void;
};

export default function LikesModal({ postId, visible, onClose }: LikesModalProps) {
  const likes = useQuery(api.likes.getPostLikes, { postId });
  const toggleFollow = useMutation(api.users.toggleFollow);

  const handleToggleFollow = async (userId: Id<"users">) => {
    try {
      await toggleFollow({ followingId: userId });
    } catch (error) {
      console.error("Error toggling follow from likes modal:", error);
    }
  };

  const likesCount = likes?.length ?? 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Likes</Text>
          <View style={{ width: 24 }} />
        </View>

        {likes !== undefined && (
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
            }}
          >
            <Text style={{ color: COLORS.white, fontSize: 14 }}>
              {likesCount.toLocaleString()} likes
            </Text>
          </View>
        )}

        {likes === undefined ? (
          <View style={[styles.centered, { flex: 1 }]}>
            <Loader />
          </View>
        ) : likes.length === 0 ? (
          <View style={[styles.centered, { flex: 1 }]}>
            <Text style={{ color: COLORS.grey }}>No likes yet</Text>
          </View>
        ) : (
          <FlatList
            data={likes}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <View style={styles.commentContainer}>
                <Image
                  source={item.image}
                  style={styles.commentAvatar}
                  contentFit="cover"
                  transition={200}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.commentUsername}>{item.username}</Text>
                  {item.fullname && (
                    <Text
                      style={{ color: COLORS.grey, fontSize: 13 }}
                      numberOfLines={1}
                    >
                      {item.fullname}
                    </Text>
                  )}
                </View>
                {!item.isCurrentUser && (
                  <TouchableOpacity
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                      backgroundColor: item.isFollowing
                        ? COLORS.surface
                        : COLORS.primary,
                    }}
                    onPress={() => handleToggleFollow(item._id as Id<"users">)}
                  >
                    <Text
                      style={{
                        color: COLORS.white,
                        fontWeight: "600",
                        fontSize: 13,
                      }}
                    >
                      {item.isFollowing ? "Following" : "Follow"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            style={styles.commentsList}
            contentContainerStyle={{ paddingBottom: 16 }}
          />
        )}
      </View>
    </Modal>
  );
}
