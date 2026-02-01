import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@clerk/clerk-expo";
import { useQuery, useMutation } from "convex/react";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TouchableWithoutFeedback,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/theme";
import { Loader } from "@/components/Loader";
import { styles } from "@/styles/profile.styles";
import { Image } from "expo-image";
import { Modal } from "react-native";
import { Keyboard } from "react-native";
import { KeyboardAvoidingView } from "react-native";
import { TextInput } from "react-native";
import Post from "@/components/Post";
import StoryViewer from "@/components/StoryViewer";
import type { StoryData } from "@/components/Stories";

export default function Profile() {
  const { signOut, userId } = useAuth();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isHiddenUsersModalVisible, setIsHiddenUsersModalVisible] =
    useState(false);
  const [isUploadingStory, setIsUploadingStory] = useState(false);

  const currentUser = useQuery(
    api.users.getUserByClerkId,
    userId ? { clerkId: userId } : "skip",
  );

  const [editedProfile, setEditedProfile] = useState({
    fullname: currentUser?.fullname || "",
    bio: currentUser?.bio || "",
  });

  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [selectedStory, setSelectedStory] = useState<StoryData | null>(null);
  const posts = useQuery(api.posts.getPostsByUser, {});

  const hiddenUserIds = useQuery(api.hiddenUsers.getHiddenUsers);
  const mutedStoryUserIds = useQuery(api.stories.getMutedUsers);
  const stories = useQuery(api.stories.getStories) as StoryData[] | undefined;

  const updateProfile = useMutation(api.users.updateProfile);
  const generateStoryUploadUrl = useMutation(api.stories.generateUploadUrl);
  const createStory = useMutation(api.stories.createStory);

  const handleSaveProfile = async () => {
    await updateProfile(editedProfile);
    setIsEditModalVisible(false);
  };

  const handleAddStory = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
      });

      if (result.canceled) return;

      setIsUploadingStory(true);

      const uploadUrl = await generateStoryUploadUrl();
      const uploadResult = await FileSystem.uploadAsync(
        uploadUrl,
        result.assets[0].uri,
        {
          httpMethod: "POST",
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          mimeType: "image/jpeg",
        },
      );

      if (uploadResult.status !== 200) throw new Error("Upload failed");

      const { storageId } = JSON.parse(uploadResult.body);
      await createStory({ storageId });
    } catch (error) {
      console.error("Error uploading story:", error);
    } finally {
      setIsUploadingStory(false);
    }
  };

  if (!currentUser || posts === undefined) return <Loader />;

  const myStory = (stories ?? []).find(
    (s) => s.isCurrentUser && s.userId === currentUser._id,
  );

  const handleOpenMyStory = () => {
    if (myStory) setSelectedStory(myStory);
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.username}>{currentUser.username}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIcon} onPress={() => signOut()}>
            <Ionicons name="log-out-outline" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileInfo}>
          {/* AVATAR & STATS */}
          <View style={styles.avatarAndStats}>
            <View style={styles.avatarContainer}>
              <TouchableOpacity onPress={handleOpenMyStory} disabled={!myStory}>
                <Image
                  source={currentUser.image}
                  style={styles.avatar}
                  contentFit="cover"
                  transition={200}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.storyPlusBadge}
                onPress={handleAddStory}
                disabled={isUploadingStory}
              >
                <Ionicons name="add-circle" size={22} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{currentUser.posts}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{currentUser.followers}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{currentUser.following}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
            </View>
          </View>

          {/* USERNAME & BIO */}
          <Text style={styles.name}>{currentUser.fullname}</Text>
          {currentUser.bio && <Text style={styles.bio}>{currentUser.bio}</Text>}

          {/* ACTION BUTTONS */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditModalVisible(true)}
            >
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsHiddenUsersModalVisible(true)}
            >
              <Text style={styles.editButtonText}>Hidden Users</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* NO POSTS HANDLER */}
        {posts?.length === 0 && <NoPostsFound />}

        <FlatList
          data={posts}
          numColumns={3}
          scrollEnabled={false}
          // keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => setSelectedPost(item)}
            >
              <Image
                source={item.imageUrl}
                style={styles.gridImage}
                contentFit="cover"
                transition={200}
              />
            </TouchableOpacity>
          )}
        />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                  <Ionicons name="close" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={editedProfile.fullname}
                  onChangeText={(text) =>
                    setEditedProfile((prev) => ({ ...prev, fullname: text }))
                  }
                  placeholderTextColor={COLORS.grey}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Bio</Text>
                <TextInput
                  style={[styles.input, styles.bioInput]}
                  value={editedProfile.bio}
                  onChangeText={(text) =>
                    setEditedProfile((prev) => ({ ...prev, bio: text }))
                  }
                  multiline
                  numberOfLines={4}
                  placeholderTextColor={COLORS.grey}
                />
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveProfile}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* SELECTED IMAGE MODAL */}
      <Modal
        visible={!!selectedPost}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedPost(null)}
      >
        <View style={styles.modalBackdrop}>
          {selectedPost && (
            <View style={styles.postDetailContainer}>
              {/* Modal Header with Close Button */}
              <View style={styles.postDetailHeader}>
                <TouchableOpacity onPress={() => setSelectedPost(null)}>
                  <Ionicons name="close" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              {/* Full Post Card */}
              <ScrollView>
                <Post post={selectedPost} />
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>

      {/* HIDDEN USERS MODAL */}
      <Modal
        visible={isHiddenUsersModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsHiddenUsersModalVisible(false)}
      >
        <TouchableWithoutFeedback>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Hidden Accounts</Text>
                <TouchableOpacity
                  onPress={() => setIsHiddenUsersModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              {hiddenUserIds === undefined ||
              mutedStoryUserIds === undefined ? (
                <View style={styles.centered}>
                  <Loader />
                </View>
              ) : hiddenUserIds.length === 0 &&
                mutedStoryUserIds.length === 0 ? (
                <View style={styles.centered}>
                  <Text style={{ color: COLORS.grey }}>
                    You haven&apos;t hidden any accounts.
                  </Text>
                </View>
              ) : (
                <ScrollView>
                  {hiddenUserIds.length > 0 && (
                    <>
                      <Text
                        style={{
                          color: COLORS.grey,
                          fontSize: 13,
                          marginBottom: 8,
                        }}
                      >
                        Hidden feed accounts
                      </Text>
                      {hiddenUserIds.map((userId) => (
                        <HiddenUserItem
                          key={userId}
                          userId={userId as Id<"users">}
                        />
                      ))}
                    </>
                  )}

                  {mutedStoryUserIds.length > 0 && (
                    <>
                      <Text
                        style={{
                          color: COLORS.grey,
                          fontSize: 13,
                          marginTop: 16,
                          marginBottom: 8,
                        }}
                      >
                        Hidden story accounts
                      </Text>
                      {mutedStoryUserIds.map((userId) => (
                        <HiddenStoryUserItem
                          key={userId}
                          userId={userId as Id<"users">}
                        />
                      ))}
                    </>
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* STORY VIEWER FROM PROFILE AVATAR */}
      <StoryViewer
        visible={!!selectedStory}
        story={selectedStory}
        onClose={() => setSelectedStory(null)}
      />
    </View>
  );
}

function HiddenUserItem({ userId }: { userId: Id<"users"> }) {
  const user = useQuery(api.users.getUserProfile, { id: userId });
  const hideUser = useMutation(api.hiddenUsers.hideUser);

  if (user === undefined) {
    return null;
  }

  const handleUnhide = async () => {
    try {
      await hideUser({ hiddenUserId: userId });
    } catch (error) {
      console.error("Error unhiding user:", error);
    }
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 8,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Image
          source={user.image}
          style={{ width: 40, height: 40, borderRadius: 20 }}
          contentFit="cover"
          transition={200}
        />
        <View>
          <Text style={styles.name}>{user.fullname}</Text>
          <Text style={{ color: COLORS.grey }}>@{user.username}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={{
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 8,
          backgroundColor: COLORS.surface,
        }}
        onPress={handleUnhide}
      >
        <Text style={{ color: COLORS.white, fontWeight: "600" }}>Unhide</Text>
      </TouchableOpacity>
    </View>
  );
}

function HiddenStoryUserItem({ userId }: { userId: Id<"users"> }) {
  const user = useQuery(api.users.getUserProfile, { id: userId });
  const toggleMute = useMutation(api.stories.toggleMuteUser);

  if (user === undefined) {
    return null;
  }

  const handleUnmute = async () => {
    try {
      await toggleMute({ mutedUserId: userId });
    } catch (error) {
      console.error("Error unmuting story user:", error);
    }
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 8,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Image
          source={user.image}
          style={{ width: 40, height: 40, borderRadius: 20 }}
          contentFit="cover"
          transition={200}
        />
        <View>
          <Text style={styles.name}>{user.fullname}</Text>
          <Text style={{ color: COLORS.grey }}>@{user.username}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={{
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 8,
          backgroundColor: COLORS.surface,
        }}
        onPress={handleUnmute}
      >
        <Text style={{ color: COLORS.white, fontWeight: "600" }}>
          Unhide stories
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function NoPostsFound() {
  return (
    <View
      style={{
        height: "100%",
        backgroundColor: COLORS.background,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Ionicons name="images-outline" size={48} color={COLORS.primary} />
      <Text>No posts yet</Text>
    </View>
  );
}
