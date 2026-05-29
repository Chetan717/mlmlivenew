import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Stage, Layer, Text, Image, Transformer, Group } from "react-konva";
import useImage from "use-image";
import ListOfTemplates from "./components/ListOfTemplates";
import AiRetouchModal from "./AiRetouchModal";
import facebook from "./sociallogo/facebook.png";
import instagram from "./sociallogo/insta.png";
import youtube from "./sociallogo/youtube.png";
import x from "./sociallogo/x.png";
import Loc from "./sociallogo/loc.png";
import zoom from "./sociallogo/zoom.png";
import meet from "./sociallogo/meet.png";
import { Button, isRTL } from "@heroui/react";
// Bundle the FFmpeg core locally (served from this app's own origin) so the
// video export does not depend on external CDNs, which can be blocked/timeout.
import ffmpegCoreURL from "@ffmpeg/core?url";
import ffmpegWasmURL from "@ffmpeg/core/wasm?url";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@firebase-config"; // ← adjust to your firebase config path
// Golden amount number images
import num0 from "./amount_numberImage/number_0.png";
import num1 from "./amount_numberImage/number_1.png";
import num2 from "./amount_numberImage/number_2.png";
import num3 from "./amount_numberImage/number_3.png";
import num4 from "./amount_numberImage/number_4.png";
import num5 from "./amount_numberImage/number_5.png";
import num6 from "./amount_numberImage/number_6.png";
import num7 from "./amount_numberImage/number_7.png";
import num8 from "./amount_numberImage/number_8.png";
import num9 from "./amount_numberImage/number_9.png";
import numComma from "./amount_numberImage/comma.png";
import numRupee from "./amount_numberImage/rupee.png";

const STAGE_WIDTH = 320;
const STAGE_HEIGHT = 320;
const EXPORT_PIXEL_RATIO = 3;

// Video export tuning — kept separate from the (frozen) image EXPORT_PIXEL_RATIO.
// A smaller frame means far fewer pixels for FFmpeg to encode, so the
// image+music -> video conversion is dramatically faster.
const VIDEO_PIXEL_RATIO = 2; // 320 * 2 = 640px square frame
const MAX_MUSIC_SECONDS = 20; // hard-trim every track to 0:20

// Credit cost per export type.
const IMAGE_CREDIT_COST = 1; // image download = 1 credit
const VIDEO_CREDIT_COST = 2; // image+music video = 2 credits

// Preset background tracks. Add tracks here in the future (hosted by URL):
//   { name: "Upbeat Vibes", url: "https://your-cdn.com/audio/upbeat.mp3" }
// They will appear as selectable options in the music modal.
const PRESET_AUDIOS = [];

export const GENERAL_SELECT_TYPES = [
  { name: "Motivational", value: "Motivational" },
  {
    name: "Thank You (Birthday & Anniversary)",
    value: "ThankYou_Birthday_Anniversary",
  },
];
export const GENERAL_SELECT_TYPES2 = [
  { name: "Good_Morning", value: "Good_Morning" },
  { name: "Health_Tips", value: "Health_Tips" },
  { name: "Greeting & Wishes", value: "Greeting_Wishes" },
  // { name: "Anniversary_Birthday", value: "Anniversary_Birthday" },
  { name: "Devotional_Spiritual", value: "Devotional_Spiritual" },
  { name: "Leader_Quotes", value: "Leader_Quotes" },
  { name: "Festival", value: "Festival" },
  { name: "Trending", value: "Trending" },
];

const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

// ── Parse "DD MMM YYYY" → Date ────────────────────────────────────────────────
const parseExpiryDate = (dateStr) => {
  if (!dateStr) return null;
  const months = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  };
  const [day, mon, year] = dateStr.split(" ");
  const month = months[mon];
  if (month === undefined) return null;
  return new Date(Number(year), month, Number(day), 23, 59, 59);
};

const AMOUNT_GRADIENT_OPTIONS = [
  // Gold variants
  {
    id: "gold1",
    name: "Gold Classic",
    stops: [
      0,
      "#ffd700",
      0.3,
      "#ffed4e",
      0.6,
      "#d4af37",
      0.9,
      "#b8860b",
      1,
      "#daa520",
    ],
    preview:
      "linear-gradient(135deg, #ffd700 0%, #ffed4e 30%, #d4af37 60%, #b8860b 90%, #daa520 100%)",
  },
  {
    id: "gold2",
    name: "Gold Luxe",
    stops: [
      0,
      "#ffed4e",
      0.25,
      "#ffd700",
      0.5,
      "#ffb347",
      0.75,
      "#ff8c00",
      1,
      "#daa520",
    ],
    preview:
      "linear-gradient(135deg, #ffed4e 0%, #ffd700 25%, #ffb347 50%, #ff8c00 75%, #daa520 100%)",
  },
  // Silver variants
  {
    id: "silver1",
    name: "Silver Frost",
    stops: [
      0,
      "#f8f8ff",
      0.3,
      "#c0c0c0",
      0.6,
      "#a8a8a8",
      0.9,
      "#808080",
      1,
      "#696969",
    ],
    preview:
      "linear-gradient(135deg, #f8f8ff 0%, #c0c0c0 30%, #a8a8a8 60%, #808080 90%, #696969 100%)",
  },
  {
    id: "silver2",
    name: "Silver Shine",
    stops: [
      0,
      "#e6e6fa",
      0.25,
      "#d3d3d3",
      0.5,
      "#b0b0b0",
      0.75,
      "#909090",
      1,
      "#778899",
    ],
    preview:
      "linear-gradient(135deg, #e6e6fa 0%, #d3d3d3 25%, #b0b0b0 50%, #909090 75%, #778899 100%)",
  },
  // Diamond variants (Red-tinted)
  {
    id: "diamond1",
    name: "Red Diamond",
    stops: [
      0,
      "#ffcccc",
      0.3,
      "#ff6666",
      0.6,
      "#cc3333",
      0.9,
      "#990000",
      1,
      "#660000",
    ],
    preview:
      "linear-gradient(135deg, #ffcccc 0%, #ff6666 30%, #cc3333 60%, #990000 90%, #660000 100%)",
  },
  {
    id: "diamond2",
    name: "Ruby Diamond",
    stops: [
      0,
      "#ffe6e6",
      0.25,
      "#ff9999",
      0.5,
      "#ff4d4d",
      0.75,
      "#cc0000",
      1,
      "#990033",
    ],
    preview:
      "linear-gradient(135deg, #ffe6e6 0%, #ff9999 25%, #ff4d4d 50%, #cc0000 75%, #990033 100%)",
  },
];

const btnStyle = (bg) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "14px 8px",
  borderRadius: 14,
  border: "none",
  background: bg,
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: `0 4px 12px ${bg}55`,
});

// ── Toast component ───────────────────────────────────────────────────────────
function Toast({ message, type }) {
  const colors = { error: "#ef4444", success: "#22c55e", info: "#6366f1" };
  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        background: colors[type] || colors.info,
        color: "#fff",
        padding: "10px 20px",
        borderRadius: 30,
        fontWeight: 600,
        fontSize: 13,
        zIndex: 2000,
        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        whiteSpace: "nowrap",
      }}
    >
      {message}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Audio duration promise helper (reliable — avoids race condition) ──────────
const getAudioDuration = (fileOrUrl) =>
  new Promise((resolve, reject) => {
    const isUrl = typeof fileOrUrl === "string";
    const url = isUrl ? fileOrUrl : URL.createObjectURL(fileOrUrl);
    const cleanup = () => {
      if (!isUrl) URL.revokeObjectURL(url);
    };
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      cleanup();
      resolve(isFinite(audio.duration) ? audio.duration : null);
    };
    audio.onerror = () => {
      cleanup();
      reject(new Error("Could not read audio metadata."));
    };
    audio.src = url;
  });

// ── Smooth animated progress counter ─────────────────────────────────────────
function useAnimatedProgress(target) {
  const [displayed, setDisplayed] = React.useState(0);
  React.useEffect(() => {
    let raf;
    const step = () => {
      setDisplayed((prev) => {
        const diff = target - prev;
        if (Math.abs(diff) < 0.5) return target;
        raf = requestAnimationFrame(step);
        return prev + diff * 0.12;
      });
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return Math.round(displayed);
}

function GeneralEditPage({
  selectedTopFrame,
  setIsOpenFtr,
  setIsOpen,
  selectedFooterFrame,
  middaleImage,
  setmiddaleImage,
}) {
  const stageRef = useRef(null);
  const profileImageRef = useRef(null);
  const rankImageRef = useRef(null);
  const stickerImageRef = useRef(null);
  const transformerRef = useRef(null);
  const stageContainerRef = useRef(null);

  const [mlmForm, setMlmForm] = useState(null);
  const [mlmProfile, setMlmProfile] = useState(null);
  const [selected, setSelected] = useState(null);
  const [isImageSelected, setIsImageSelected] = useState(false);
  const [selectedImageType, setSelectedImageType] = useState(null);
  const [toolbarPos, setToolbarPos] = useState({ x: 0, y: 0, width: 0 });

  // ── Subscription & user state ─────────────────────────────────────────────
  const [activeSub, setActiveSub] = useState(null); // single active sub object
  const [userData, setUserData] = useState(null); // user doc
  const [subLoading, setSubLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [toast, setToast] = useState(null); // { message, type }
  const [exportedUri, setExportedUri] = useState(null); // for share modal
  const [achievementForm, setAchievementForm] = useState(null); // loaded from localStorage
  const [incomeFormData, setIncomeFormData] = useState(null); // loaded from localStorage
  const [meetingData, setMeetingData] = useState(null); // loaded from localStorage
  const [showSocial, setShowSocial] = useState("no");

  // ── Music + export progress ─────────────────────────────────────────────
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [musicExporting, setMusicExporting] = useState(false);
  const [musicModalOpen, setMusicModalOpen] = useState(false);
  const [presetLoadingUrl, setPresetLoadingUrl] = useState(null);
  const [deviceLoading, setDeviceLoading] = useState(false);
  const [progressTarget, setProgressTarget] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [progressLogs, setProgressLogs] = useState([]);
  const musicInputRef = useRef(null);
  const ffmpegRef = useRef(null);
  const exportInProgressRef = useRef(false); // hard re-entry guard for credit safety
  const displayProgress = useAnimatedProgress(progressTarget);

  const showToast = (message, type = "info", duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  };

  // Load achievement, income form, and meeting data from localStorage
  useEffect(() => {
    try {
      const savedAchieve = localStorage.getItem("achieve_form");
      const ShowSocial = localStorage.getItem("socialradio");
      setShowSocial("no");
      if (savedAchieve) {
        const data = JSON.parse(savedAchieve);
        setAchievementForm(data);
      }
    } catch (err) {
      console.error("Failed to load achieve_form:", err);
    }

    try {
      const savedIncome = localStorage.getItem("income_form");
      if (savedIncome) {
        const data = JSON.parse(savedIncome);
        setIncomeFormData(data);
      }
    } catch (err) {
      console.error("Failed to load income_form:", err);
    }

    try {
      const savedMeeting = localStorage.getItem("Meeting");
      if (savedMeeting) {
        const data = JSON.parse(savedMeeting);
        setMeetingData(data);
      }
    } catch (err) {
      console.error("Failed to load Meeting data:", err);
    }
  }, []);

  const isRight = selected?.position === "right";

  const selll = getSelType();

  const [closeFilter, setCloseFilter] = useState(() => {
    try {
      return localStorage.getItem("close_filter") || "SP";
    } catch {
      return "SP";
    }
  });

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === "close_filter") setCloseFilter(e.newValue || "SP");
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const isSubGeneralType = GENERAL_SELECT_TYPES.some(
    (t) => t.value === selll?.type,
  );
  const isSubGeneralType2 = GENERAL_SELECT_TYPES2.some(
    (t) => t.value === selll?.type,
  );
  const Template_Type = selll?.type;

  const [profileAttrs, setProfileAttrs] = useState({
    x: isRight ? 155 : 100,
    y: 80,
    width: 160,
    height: 210,
    scaleX: 1,
    offsetX: 0,
    scaleY: 1, // ← add
    offsetY: 0, // ← add
  });
  const isBonanza = Template_Type === "Bonanza";
  const isWelcomeClosing = Template_Type === "Welcome_Closing";
  const isAchievement = Template_Type === "Achievements";
  const isWelcome = selll?.Subtype === "WELCOME";
  const isClosing = selll?.Subtype === "CLOSING";
  const isAnyversary = selll?.type === "Anniversary_Birthday";
  const isIncome = selll?.type === "Income";
  const isCapping = selll?.type === "Capping";
  const isMeeting = selll?.type === "Meeting";

  const rankInitialAttrs = useMemo(() => {
    return {
      x: isMeeting
        ? isRight
          ? 184.5
          : 0.5
        : isCapping
          ? isRight
            ? 210
            : 10
          : isIncome
            ? isRight
              ? 80
              : 17
            : isAnyversary
              ? isRight
                ? 180
                : 10
              : isClosing
                ? isRight
                  ? 200
                  : 10
                : isWelcome
                  ? isRight
                    ? 190
                    : 18
                  : isRight
                    ? 200
                    : 10,
      y: isMeeting
        ? isRight
          ? 81.8
          : 81.8
        : isCapping
          ? 65
          : isIncome
            ? 110
            : isAnyversary
              ? 40
              : isClosing
                ? 110
                : isWelcome
                  ? 64
                  : isBonanza
                    ? 75
                    : 46,
      width: isMeeting
        ? 135
        : isCapping
          ? 100
          : isIncome
            ? 100
            : isAnyversary
              ? 130
              : 110,
      height: isMeeting
        ? 200
        : isCapping
          ? 150
          : isIncome
            ? 150
            : isAnyversary
              ? 220
              : isClosing
                ? 130
                : isWelcome
                  ? 160
                  : isBonanza
                    ? 160
                    : 190,
      scaleX: 1,
      offsetX: 0,
      scaleY: 1, // ← add
      offsetY: 0, // ← add
    };
  }, [isRight, Template_Type]);

  const [rankAttrs, setRankAttrs] = useState(() => rankInitialAttrs);

  const stickerInitialAttrs = useMemo(
    () => ({
      x: isCapping
        ? isRight
          ? 190
          : 1
        : isAnyversary
          ? isRight
            ? 140
            : 1
          : isAchievement
            ? 1
            : isClosing
              ? isRight
                ? 190
                : 0
              : isWelcome
                ? isRight
                  ? 168
                  : 2
                : isBonanza
                  ? isRight
                    ? 179
                    : 2
                  : isRight
                    ? 190
                    : 2,
      y: isCapping
        ? 202
        : isIncome
          ? 235
          : isAnyversary
            ? 193
            : isAchievement
              ? 185
              : isClosing
                ? isRight
                  ? 225
                  : 225
                : isWelcome
                  ? isRight
                    ? 189
                    : 192
                  : isBonanza
                    ? 182
                    : 222,
      width: isIncome
        ? 140
        : isAnyversary
          ? 180
          : isAchievement
            ? 110
            : isWelcome
              ? 150
              : isBonanza
                ? 140
                : 130,
      height: isIncome
        ? 40
        : isAnyversary
          ? 100
          : isAchievement
            ? 60
            : isClosing
              ? 50
              : isWelcome
                ? 60
                : isBonanza
                  ? 100
                  : 30,
      scaleX: 1,
      offsetX: 0,
      scaleY: 1, // ← add
      offsetY: 0, // ← add
    }),
    [isRight, Template_Type],
  );

  const [stickerAttrs, setStickerAttrs] = useState(() => stickerInitialAttrs);

  useEffect(() => {
    setProfileAttrs((prev) => ({
      ...prev,
      x: isRight ? 155 : 165,
      y: 80,
      width: 160,
      height: 210,
      scaleX: isRight ? -1 : 1,
      offsetX: 0,
    }));
    setRankAttrs(rankInitialAttrs);
    setStickerAttrs(stickerInitialAttrs);
  }, [isRight, Template_Type, rankInitialAttrs, stickerInitialAttrs]);

  function getSelType() {
    try {
      return JSON.parse(localStorage.getItem("selType")) || {};
    } catch {
      return {};
    }
  }

  // ── REPLACE handleFlip with these three handlers ──────────────────────────

  const handleImageClick = (type) => (e) => {
    e.cancelBubble = true;
    if (selectedImageType === type && isImageSelected) {
      // toggle off
      setIsImageSelected(false);
      setSelectedImageType(null);
    } else {
      setIsImageSelected(true);
      setSelectedImageType(type);
    }
  };
  const handleTransformEnd = (type) => (e) => {
    const node = e.target;
    const newWidth = Math.max(10, node.width() * Math.abs(node.scaleX()));
    const newHeight = Math.max(10, node.height() * Math.abs(node.scaleY()));
    const newX = node.x();
    const newY = node.y();
    const currentScaleX = node.scaleX() < 0 ? -1 : 1;
    const currentScaleY = node.scaleY() < 0 ? -1 : 1; // ← add

    node.scaleX(currentScaleX);
    node.scaleY(currentScaleY); // ← add
    node.width(newWidth);
    node.height(newHeight);
    if (currentScaleX === -1) node.offsetX(newWidth);
    if (currentScaleY === -1) node.offsetY(newHeight); // ← add
    node.getLayer()?.batchDraw();

    const update = (prev) => ({
      ...prev,
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
      scaleX: currentScaleX,
      offsetX: currentScaleX === -1 ? newWidth : 0,
      scaleY: currentScaleY, // ← add
      offsetY: currentScaleY === -1 ? newHeight : 0, // ← add
    });

    if (type === "profile") setProfileAttrs(update);
    else if (type === "rank") setRankAttrs(update);
    else if (type === "sticker") setStickerAttrs(update);
  };

  const handleDragEnd = (type) => (e) => {
    const node = e.target;
    if (type === "profile") {
      setProfileAttrs((prev) => ({ ...prev, x: node.x(), y: node.y() }));
    } else if (type === "rank") {
      setRankAttrs((prev) => ({ ...prev, x: node.x(), y: node.y() }));
    } else if (type === "sticker") {
      setStickerAttrs((prev) => ({ ...prev, x: node.x(), y: node.y() }));
    }
  };

  const boundBoxFunc = (oldBox, newBox) => {
    if (newBox.width < 20 || newBox.height < 20) return oldBox;
    if (
      newBox.x < 0 ||
      newBox.y < 0 ||
      newBox.x + newBox.width > STAGE_WIDTH ||
      newBox.y + newBox.height > STAGE_HEIGHT
    )
      return oldBox;
    return newBox;
  };

  // ── Load mlm form/profile from localStorage ───────────────────────────────
  useEffect(() => {
    const formData = localStorage.getItem("mlmform");
    const profileData = localStorage.getItem("mlmProfile");
    if (formData) setMlmForm(JSON.parse(formData));
    if (profileData) {
      const parsed = JSON.parse(profileData);
      setMlmProfile(parsed);
      setmiddaleImage(parsed?.profileImageURLs?.[0] || null);
    }
  }, []);

  // ── Fetch ONLY active subscription + user referCredits ────────────────────
  const fetchSubscriptionAndUser = useCallback(async () => {
    try {
      setSubLoading(true);
      const raw = localStorage.getItem("usermlm");
      if (!raw) return;
      const user = JSON.parse(raw);
      const mobileNo = user?.mobileNo;
      if (!mobileNo) return;

      // Only active subscription
      const activeQuery = query(
        collection(db, "subscription"),
        where("mobileNo", "==", mobileNo),
        where("Active", "==", true),
        where("Expire", "==", false),
      );

      // Fetch user doc for referCredits
      const userQuery = query(
        collection(db, "users"),
        where("mobileNo", "==", mobileNo),
      );

      const [activeSnap, userSnap] = await Promise.all([
        getDocs(activeQuery),
        getDocs(userQuery),
      ]);

      // Take the most recent active sub
      const activeSubs = activeSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort(
          (a, b) => (b.PurchaseAt?.seconds ?? 0) - (a.PurchaseAt?.seconds ?? 0),
        );

      setActiveSub(activeSubs[0] || null);

      if (!userSnap.empty) {
        setUserData({ id: userSnap.docs[0].id, ...userSnap.docs[0].data() });
      }
    } catch (err) {
      console.error("Error fetching subscription/user:", err);
    } finally {
      setSubLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptionAndUser();
  }, [fetchSubscriptionAndUser]);

  // ── Transformer sync ──────────────────────────────────────────────────────
  const getSelectedImageRef = () => {
    if (selectedImageType === "profile") return profileImageRef.current;
    if (selectedImageType === "rank") return rankImageRef.current;
    if (selectedImageType === "sticker") return stickerImageRef.current;
    return null;
  };

  const getSelectedImageAttrs = () => {
    if (selectedImageType === "profile") return profileAttrs;
    if (selectedImageType === "rank") return rankAttrs;
    if (selectedImageType === "sticker") return stickerAttrs;
    return null;
  };

  useEffect(() => {
    if (!transformerRef.current) return;
    if (isImageSelected) {
      const node = getSelectedImageRef();
      transformerRef.current.nodes(node ? [node] : []);
      updateToolbarPos();
    } else {
      transformerRef.current.nodes([]);
    }
    transformerRef.current.getLayer()?.batchDraw();
  }, [isImageSelected, selectedImageType]);

  const updateToolbarPos = () => {
    const attrs = getSelectedImageAttrs();
    if (!attrs) return;
    const { x, y, width, scaleX } = attrs;
    const leftEdge = scaleX === -1 ? x - width : x;
    setToolbarPos({ x: leftEdge, y, width });
  };

  useEffect(() => {
    if (isImageSelected) updateToolbarPos();
  }, [
    profileAttrs,
    rankAttrs,
    stickerAttrs,
    isImageSelected,
    selectedImageType,
  ]);

  // ── Computed display values ───────────────────────────────────────────────

  const SocialURLs = mlmProfile?.socials || {};
  const socialText =
    SocialURLs.Youtube ||
    SocialURLs.Instagram ||
    SocialURLs.Facebook ||
    SocialURLs.X ||
    "";
  const availableSocials = [
    SocialURLs.Youtube ? "youtube" : null,
    SocialURLs.Instagram ? "instagram" : null,
    SocialURLs.Facebook ? "facebook" : null,
    SocialURLs.X ? "x" : null,
  ].filter(Boolean);

  const socialIconShift = Math.max(0, socialText.length - 6);

  const socialIconBaseXLeft = !isSubGeneralType
    ? clamp(30 - socialIconShift, 160, 220)
    : clamp(210 - socialIconShift, 160, 220);

  const socialIconBaseXRight = !isSubGeneralType
    ? clamp(50 - socialIconShift, 95, 100)
    : clamp(65 - socialIconShift, 60, 100);

  const socialIconPositionsLeft = availableSocials.map(
    (_, i) => socialIconBaseXLeft + i * 6,
  );
  const socialIconPositionsRight = availableSocials.map(
    (_, i) => socialIconBaseXRight + i * 6,
  );

  const socialTextXLeft =
    availableSocials.length <= 2
      ? !isSubGeneralType
        ? 143
        : 138
      : availableSocials.length <= 3
        ? !isSubGeneralType
          ? 147
          : 145
        : isSubGeneralType
          ? 149
          : 149;

  const socialTextXRight =
    availableSocials.length <= 2
      ? !isSubGeneralType
        ? 86
        : 1
      : availableSocials.length <= 3
        ? !isSubGeneralType
          ? 90
          : 1
        : !isSubGeneralType
          ? 80
          : 2;

  const topuplineURLs = mlmProfile?.topuplineURLs || [];
  const profileName = mlmForm?.promoter?.name
    ? mlmForm.promoter.name
    : mlmProfile?.fullName || "";
  const profileMobile = mlmForm?.promoter?.name
    ? mlmForm.promoter.mobile
    : mlmProfile?.mobile || "";
  const designation = mlmForm?.promoter?.name
    ? mlmForm.promoter.role
    : mlmProfile?.designation;

  const AchiveName = achievementForm?.name || "";
  const AchivePrice = achievementForm?.price || "";

  const incomePrice = incomeFormData?.amount || "";
  const incomeDay = incomeFormData?.noOfDay || "";
  const incomeType = incomeFormData?.typeOfIncome || "";

  const [bgImage] = useImage(`${selected?.url || ""}`, "anonymous");
  const [Sticker] = useImage(`${selected?.bannerId || ""}`, "anonymous");
  const [AchiveFrame] = useImage(
    `${selected?.nameImageUrl || ""}`,
    "anonymous",
  );

  // ── Golden digit images ───────────────────────────────────────────────────
  const [imgNum0] = useImage(num0, "anonymous");
  const [imgNum1] = useImage(num1, "anonymous");
  const [imgNum2] = useImage(num2, "anonymous");
  const [imgNum3] = useImage(num3, "anonymous");
  const [imgNum4] = useImage(num4, "anonymous");
  const [imgNum5] = useImage(num5, "anonymous");
  const [imgNum6] = useImage(num6, "anonymous");
  const [imgNum7] = useImage(num7, "anonymous");
  const [imgNum8] = useImage(num8, "anonymous");
  const [imgNum9] = useImage(num9, "anonymous");
  const [imgComma] = useImage(numComma, "anonymous");
  const [imgRupee] = useImage(numRupee, "anonymous");

  const digitImageMap = useMemo(
    () => ({
      0: imgNum0,
      1: imgNum1,
      2: imgNum2,
      3: imgNum3,
      4: imgNum4,
      5: imgNum5,
      6: imgNum6,
      7: imgNum7,
      8: imgNum8,
      9: imgNum9,
      ",": imgComma,
      "₹": imgRupee,
    }),
    [
      imgNum0,
      imgNum1,
      imgNum2,
      imgNum3,
      imgNum4,
      imgNum5,
      imgNum6,
      imgNum7,
      imgNum8,
      imgNum9,
      imgComma,
      imgRupee,
    ],
  );

  // ── Golden Amount Image Renderer ──────────────────────────────────────────────
  function GoldenAmountImages({
    amountText,
    digitImageMap,
    startX,
    y,
    digitHeight,
    spacing = 2,
    onTap,
  }) {
    const aspectMap = {
      "₹": 0.6,
      0: 0.72,
      1: 0.48,
      2: 0.6,
      3: 0.57,
      4: 0.63,
      5: 0.6,
      6: 0.6,
      7: 0.57,
      8: 0.59,
      9: 0.6,
      ",": 0.28,
      X: 0.55,
    };

    // ← ADD THIS: vertical offset per character
    const yOffsetMap = {
      ",": digitHeight * 0.62,
    };

    const chars = amountText.split("");
    let curX = startX;
    const nodes = [];

    chars.forEach((ch, i) => {
      const img = digitImageMap[ch];
      const aspect = aspectMap[ch] ?? 0.6;
      const digitWidth = digitHeight * aspect;
      const yOffset = yOffsetMap[ch] ?? 0; // ← ADD THIS

      if (img) {
        nodes.push(
          <Image
            key={`amt-${i}-${ch}`}
            image={img}
            x={curX}
            y={y + yOffset} // ← USE yOffset HERE
            width={digitWidth + 7}
            height={digitHeight * (ch === "," ? 0.45 : 1)} // ← comma is shorter too
            onClick={onTap}
            onTap={onTap}
          />,
        );
      } else {
        nodes.push(
          <Text
            key={`amt-${i}-${ch}`}
            x={curX}
            y={y + yOffset + 2} // ← AND HERE
            text={ch}
            fontSize={digitHeight * 0.78}
            fill="#ffd700"
            fontStyle="bold"
            onClick={onTap}
            onTap={onTap}
          />,
        );
      }

      curX += digitWidth + spacing;
    });

    return <>{nodes}</>;
  }

  const [Imagefooter] = useImage(selectedFooterFrame?.value, "anonymous");
  const [Imagel2] = useImage(mlmProfile?.logoURLs?.[0] || "", "anonymous");
  const [Imagel3] = useImage(mlmProfile?.logoURLs?.[1] || "", "anonymous");
  const [Imagel4] = useImage(mlmProfile?.logoURLs?.[2] || "", "anonymous");

  const [Imagef1] = useImage(achievementForm?.features?.[0] || "", "anonymous");
  const [Imagef2] = useImage(achievementForm?.features?.[1] || "", "anonymous");
  const [Imagef3] = useImage(achievementForm?.features?.[2] || "", "anonymous");

  const [MainAchieveImage] = useImage(
    achievementForm?.mainImage || "",
    "anonymous",
  );

  const [MainIncomeProof] = useImage(
    incomeFormData?.proofImage || "",
    "anonymous",
  );
  const [ImagetopFrame] = useImage(selectedTopFrame?.value || "", "anonymous");
  const [Imagetop1] = useImage(topuplineURLs?.[0] || "", "anonymous");
  const [Imagetop2] = useImage(topuplineURLs?.[1] || "", "anonymous");
  const [Imagetop3] = useImage(topuplineURLs?.[2] || "", "anonymous");
  const [Imagetop4] = useImage(topuplineURLs?.[3] || "", "anonymous");
  const [Imagetop5] = useImage(topuplineURLs?.[4] || "", "anonymous");
  const [Imagetop6] = useImage(topuplineURLs?.[5] || "", "anonymous");
  const [Imagetop7] = useImage(topuplineURLs?.[6] || "", "anonymous");
  const [Imagetop8] = useImage(topuplineURLs?.[7] || "", "anonymous");
  const [ImageChief] = useImage(meetingData?.chiefImage || "", "anonymous");

  const [ImageProfile] = useImage(
    mlmForm?.promoter?.name
      ? `${mlmForm.promoter.image}`
      : `${middaleImage || ""}`,
    "anonymous",
  );

  const [amountPatternId, setAmountPatternId] = useState("gold1");
  const [isAmountModalOpen, setIsAmountModalOpen] = useState(false);

  const selectedAmountOption = AMOUNT_GRADIENT_OPTIONS.find(
    (option) => option.id === amountPatternId,
  );
  const [ImageRank] = useImage(mlmForm?.achiever?.image, "anonymous");
  const [ImageRank2] = useImage(mlmForm?.achiever?.image, "anonymous");
  const formname = mlmForm?.achiever?.achieverName || "";
  const formcity = mlmForm?.achiever?.city || "";
  const formamount = isIncome
    ? incomeFormData?.amount
    : isAchievement
      ? achievementForm?.price
      : mlmForm?.achiever?.amount || "";

  const formatAmount = (value) => {
    const cleaned = String(value).replace(/,/g, "").trim();
    const numeric = Number(cleaned);
    if (!Number.isFinite(numeric)) return cleaned;
    return numeric.toLocaleString("en-IN");
  };

  const amountText =
    String(formamount).trim() !== ""
      ? `₹${formatAmount(formamount)}`
      : "XXXXXXX";

  const charslen = amountText.split("");
  const [insta] = useImage(instagram, "anonymous");
  const [fb] = useImage(facebook, "anonymous");
  const [yt] = useImage(youtube, "anonymous");
  const [xlogo] = useImage(x, "anonymous");
  const [zooml] = useImage(zoom, "anonymous");
  const [meetl] = useImage(meet, "anonymous");
  const [locl] = useImage(Loc, "anonymous");
  // ── Download badge: plan downloads + referCredits ─────────────────────────
  const planDownloads = activeSub?.download ?? 0;
  const referCredits = userData?.referCredit ?? 0;
  const totalDownloadsAvailable = planDownloads + referCredits;

  // ── Shared credit guard ───────────────────────────────────────────────────
  // Returns true if the user may spend `cost` credits, else shows a toast and
  // returns false. Used by both image and video export paths.
  const checkCredits = (cost) => {
    if (!activeSub) {
      showToast(
        "No active subscription found. Please subscribe to export.",
        "error",
      );
      return false;
    }
    const expiry = parseExpiryDate(activeSub.expirydate);
    if (expiry && new Date() > expiry) {
      showToast(
        "Your subscription has expired. Please renew to continue.",
        "error",
      );
      return false;
    }
    if (totalDownloadsAvailable < cost) {
      showToast(
        `This export needs ${cost} credit${cost > 1 ? "s" : ""}, but you have ${totalDownloadsAvailable}. Please renew your plan.`,
        "error",
        4000,
      );
      return false;
    }
    return true;
  };

  // ── Shared credit deduction ───────────────────────────────────────────────
  // Spends `cost` credits: plan downloads first, then refer credits. Updates
  // Firestore + local state and shows a result toast. Call AFTER a successful
  // download/export. `prefix` starts the toast message (e.g. "Downloaded!").
  const deductCredits = async (cost, prefix = "Downloaded!") => {
    let remaining = cost;
    const fromPlan = Math.min(planDownloads, remaining);
    const newPlan = planDownloads - fromPlan;
    remaining -= fromPlan;

    const fromRefer = Math.min(referCredits, remaining);
    const newCredits = referCredits - fromRefer;

    const totalAfter = newPlan + newCredits;
    const planExhausted = newPlan === 0 && newCredits === 0;

    if (fromPlan > 0) {
      const subRef = doc(db, "subscription", activeSub.id);
      await updateDoc(subRef, {
        download: newPlan,
        ...(planExhausted ? { Active: false, Expire: true } : {}),
      });
      setActiveSub((prev) => ({
        ...prev,
        download: newPlan,
        ...(planExhausted ? { Active: false, Expire: true } : {}),
      }));
    }

    if (fromRefer > 0) {
      const userRef = doc(db, "users", userData.id);
      await updateDoc(userRef, { referCredit: newCredits });
      setUserData((prev) => ({ ...prev, referCredit: newCredits }));
    }

    if (totalAfter === 0) {
      showToast(`${prefix} No download credits remaining.`, "error", 4000);
    } else {
      showToast(
        `${prefix} ${totalAfter} credit${totalAfter > 1 ? "s" : ""} remaining.`,
        "success",
      );
    }
  };

  // ── Core export guard + decrement logic ───────────────────────────────────
  const handleExport = async () => {
    if (exportInProgressRef.current) return; // block rapid re-entry / double-tap
    if (!checkCredits(IMAGE_CREDIT_COST)) return;
    exportInProgressRef.current = true;

    setExportLoading(true);
    setIsImageSelected(false);
    setSelectedImageType(null);

    // Small delay to let transformer deselect before canvas capture
    await new Promise((res) => setTimeout(res, 80));

    try {
      // 4️⃣ Generate the image
      const uri = stageRef.current.toDataURL({
        pixelRatio: EXPORT_PIXEL_RATIO,
        mimeType: "image/png",
        quality: 1,
      });

      // 5️⃣ Trigger actual download / RN bridge
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type: "DOWNLOAD_IMAGE",
            base64: uri,
            fileName: "mlmbooster.png",
          }),
        );
      } else {
        const link = document.createElement("a");
        link.download = "mlmbooster.png";
        link.href = uri;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // 6️⃣ Spend 1 credit (plan downloads first, then refer credits)
      await deductCredits(IMAGE_CREDIT_COST, "Downloaded!");

      // 7️⃣ Show share modal
      setExportedUri(uri);
    } catch (err) {
      console.error("Export error:", err);
      showToast("Export failed. Please try again.", "error");
    } finally {
      setExportLoading(false);
      exportInProgressRef.current = false;
    }
  };

  // ── Music selection helpers (modal) ──────────────────────────────────────
  // A device-uploaded file selected from the modal. We show a brief processing
  // state while the audio is validated (read its metadata) before accepting it.
  const handleDeviceMusic = async (file) => {
    if (!file) return;
    try {
      setDeviceLoading(true);
      if (!file.type?.startsWith("audio/")) {
        showToast("Please choose an audio file.", "error");
        return;
      }
      let duration = null;
      try {
        duration = await getAudioDuration(file);
      } catch (_) {}
      if (!duration || duration <= 0) {
        showToast("Could not read this audio file. Try another one.", "error");
        return;
      }
      setSelectedMusic({ file, name: file.name });
      setMusicModalOpen(false);
      showToast(`Music added: ${file.name}`, "success");
    } finally {
      setDeviceLoading(false);
    }
  };

  // A preset track chosen by URL — fetched into a File so the export pipeline
  // can treat it exactly like a device upload.
  const handlePresetMusic = async (preset) => {
    if (!preset?.url) return;
    try {
      setPresetLoadingUrl(preset.url);
      const resp = await fetch(preset.url);
      if (!resp.ok) throw new Error("Network error");
      const blob = await resp.blob();
      const ext = (
        preset.url.split("?")[0].split(".").pop() || "mp3"
      ).toLowerCase();
      const file = new File([blob], `${preset.name}.${ext}`, {
        type: blob.type || "audio/mpeg",
      });
      setSelectedMusic({ file, name: preset.name });
      setMusicModalOpen(false);
      showToast(`Music added: ${preset.name}`, "success");
    } catch (_) {
      showToast(
        "Could not load this track. Try another or upload from device.",
        "error",
      );
    } finally {
      setPresetLoadingUrl(null);
    }
  };

  const handleRemoveMusic = () => {
    setSelectedMusic(null);
    setMusicModalOpen(false);
    showToast("Music removed", "info");
  };

  // ── Export with music — robust ffmpeg pipeline (matches Test.jsx + RN bridge) ──
  const handleExportWithMusic = async () => {
    if (!selectedMusic?.file) {
      handleExport();
      return;
    }
    if (exportInProgressRef.current) return; // block rapid re-entry / double-tap
    if (!checkCredits(VIDEO_CREDIT_COST)) return;
    exportInProgressRef.current = true;

    // Helper: race a promise against a timeout
    const withTimeout = (promise, ms, label) =>
      Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  `${label} timed out (${ms / 1000}s). Check your internet and try again.`,
                ),
              ),
            ms,
          ),
        ),
      ]);

    setMusicExporting(true);
    setProgressTarget(0);
    setProgressLogs([]);
    setIsImageSelected(false);
    setSelectedImageType(null);
    await new Promise((res) => setTimeout(res, 80));

    let videoBlob = null;
    let videoDataUrl = null;

    try {
      // ── Stage 1: load ffmpeg engine (cached after first run) ────────────
      setProgressTarget(5);
      setProgressLabel("Loading export engine...");
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { fetchFile, toBlobURL } = await import("@ffmpeg/util");

      let ffmpeg = ffmpegRef.current;
      if (!ffmpeg) {
        ffmpeg = new FFmpeg();
        ffmpeg.on("log", ({ message }) => {
          setProgressLogs((prev) => [...prev.slice(-4), message]);
        });
        ffmpeg.on("progress", ({ progress: p }) => {
          const bump = Math.round(Math.min(Math.max(p, 0), 1) * 40) + 50;
          setProgressTarget((prev) => Math.max(prev, bump));
        });

        // Try the locally-bundled core first (served from this app's origin —
        // no external network needed), then fall back to public CDNs.
        const sources = [
          { label: "local", core: ffmpegCoreURL, wasm: ffmpegWasmURL },
          {
            label: "jsdelivr",
            core: "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js",
            wasm: "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm",
          },
          {
            label: "unpkg",
            core: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js",
            wasm: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm",
          },
        ];
        setProgressLabel("Loading codec...");
        setProgressTarget(8);

        let loaded = false;
        let lastErr = null;
        for (const src of sources) {
          try {
            const coreURL = await withTimeout(
              toBlobURL(src.core, "text/javascript"),
              45000,
              "Codec load",
            );
            setProgressTarget(11);
            const wasmURL = await withTimeout(
              toBlobURL(src.wasm, "application/wasm"),
              60000,
              "Engine load",
            );
            setProgressTarget(13);
            await withTimeout(
              ffmpeg.load({ coreURL, wasmURL }),
              30000,
              "Engine start",
            );
            loaded = true;
            break;
          } catch (e) {
            console.warn("FFmpeg core source failed:", src.label, e);
            lastErr = e;
          }
        }
        if (!loaded)
          throw new Error(
            "Could not load video engine. " +
              (lastErr?.message || "Network error"),
          );
        ffmpegRef.current = ffmpeg;
      }

      // ── Stage 2: read audio duration ────────────────────────────────────
      setProgressTarget(15);
      setProgressLabel("Reading audio duration...");
      let duration = null;
      try {
        duration = await getAudioDuration(selectedMusic.file);
      } catch (_) {}
      if (!duration || duration <= 0)
        throw new Error(
          "Could not read audio duration. Try a different audio file.",
        );
      // Hard-trim every track to 30s — keeps videos short and encoding fast.
      duration = Math.min(duration, MAX_MUSIC_SECONDS);

      // ── Stage 3: capture canvas frame ──────────────────────────────────
      // Use a smaller pixel ratio for the video frame than the (frozen) image
      // export — fewer pixels = much faster FFmpeg encoding.
      setProgressTarget(25);
      setProgressLabel("Capturing design...");
      const uri = stageRef.current.toDataURL({
        pixelRatio: VIDEO_PIXEL_RATIO,
        mimeType: "image/png",
        quality: 1,
      });
      if (!uri || uri.length < 100)
        throw new Error("Could not capture design. Try again.");

      // ── Stage 4: write files into ffmpeg memory ────────────────────────
      setProgressTarget(35);
      setProgressLabel("Preparing files...");
      await ffmpeg.writeFile("input.png", await fetchFile(uri));
      setProgressTarget(45);
      const ext =
        (selectedMusic.file?.name || "track.mp3")
          .split(".")
          .pop()
          .toLowerCase() || "mp3";
      const audName = `input.${ext}`;
      await ffmpeg.writeFile(audName, await fetchFile(selectedMusic.file));
      setProgressTarget(50);

      // ── Stage 5: encode (proven Test.jsx args) ─────────────────────────
      setProgressLabel("Encoding video (this may take a while)...");
      await ffmpeg.exec([
        "-loop",
        "1",
        "-framerate",
        "25",
        "-i",
        "input.png",
        "-i",
        audName,
        "-t",
        String(duration), // trim to <= 30s
        "-vf",
        "scale=trunc(iw/2)*2:trunc(ih/2)*2",
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-tune",
        "stillimage",
        "-c:a",
        "aac",
        "-b:a",
        "96k", // lighter audio -> smaller file, faster
        "-ar",
        "44100",
        "-ac",
        "2",
        "-pix_fmt",
        "yuv420p",
        "-r",
        "25",
        "-shortest",
        "-avoid_negative_ts",
        "make_zero",
        "-movflags",
        "+faststart",
        "output.mp4",
      ]);

      // ── Stage 6: read output ───────────────────────────────────────────
      setProgressTarget(95);
      setProgressLabel("Saving video...");
      const data = await ffmpeg.readFile("output.mp4");
      videoBlob = new Blob([data.buffer], { type: "video/mp4" });
      if (videoBlob.size < 1000)
        throw new Error(
          "Video encoding failed (file too small). Try a different audio file.",
        );

      // Cleanup ffmpeg memory before download
      try {
        await ffmpeg.deleteFile("input.png");
      } catch (_) {}
      try {
        await ffmpeg.deleteFile(audName);
      } catch (_) {}
      try {
        await ffmpeg.deleteFile("output.mp4");
      } catch (_) {}

      // ── Stage 7: deliver video (RN bridge OR browser download) ─────────
      const fileName = `mlmbooster_${Date.now()}.mp4`;
      if (window.ReactNativeWebView) {
        // Convert blob to base64 for RN bridge
        setProgressLabel("Sending to device...");
        videoDataUrl = await new Promise((res, rej) => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result);
          reader.onerror = () =>
            rej(new Error("Could not encode video for download"));
          reader.readAsDataURL(videoBlob);
        });
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type: "DOWNLOAD_VIDEO",
            base64: videoDataUrl,
            fileName,
            mimeType: "video/mp4",
          }),
        );
      } else {
        const dlUrl = URL.createObjectURL(videoBlob);
        const link = document.createElement("a");
        link.href = dlUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(dlUrl), 8000);
      }

      setProgressTarget(100);
      setProgressLabel("Done!");

      // Spend 2 credits for a video export (plan downloads first, then refer credits)
      await deductCredits(VIDEO_CREDIT_COST, "Video downloaded!");
    } catch (err) {
      console.error("Music export error:", err);
      const msg = err?.message || "Video export failed";
      showToast(msg, "error", 5000);
      // Do NOT silently fall back to image — user wanted a video
    } finally {
      setMusicExporting(false);
      exportInProgressRef.current = false;
      // Small delay so user can see 100% briefly
      setTimeout(() => {
        setProgressTarget(0);
        setProgressLabel("");
        setProgressLogs([]);
      }, 800);
    }
  };

  // ── Flip horizontal ───────────────────────────────────────────────────────
  const handleFlip = (e) => {
    e.stopPropagation();
    if (!selectedImageType) return;

    const getAttrs = () => {
      if (selectedImageType === "profile") return profileAttrs;
      if (selectedImageType === "rank") return rankAttrs;
      if (selectedImageType === "sticker") return stickerAttrs;
    };

    const setAttrs = (updater) => {
      if (selectedImageType === "profile") setProfileAttrs(updater);
      else if (selectedImageType === "rank") setRankAttrs(updater);
      else if (selectedImageType === "sticker") setStickerAttrs(updater);
    };

    const current = getAttrs();
    const isFlipped = current.offsetY === -1;

    setAttrs((prev) => ({
      ...prev,
      scaleY: isFlipped ? 1 : -1,
      offsetY: isFlipped ? 0 : prev.height,
    }));

    // Sync Konva node directly
    const nodeMap = {
      profile: profileImageRef.current,
      rank: rankImageRef.current,
      sticker: stickerImageRef.current,
    };
    const node = nodeMap[selectedImageType];
    if (node) {
      const isFlipped = node.scaleY() === -1;
      node.scaleY(isFlipped ? 1 : -1);
      node.offsetY(isFlipped ? 0 : current.height);
      node.getLayer()?.batchDraw();
    }
  };

  const handleStageMouseDown = (e) => {
    if (e.target === e.target.getStage()) {
      setIsImageSelected(false);
      setSelectedImageType(null);
    }
  };

  const ActualProfilename = profileName?.toUpperCase() || "PROFILENAME";
  const ActualDesignation = designation?.toUpperCase() || "DESIGNATION";

  let ProfilefontSize = 10;
  if (ActualProfilename?.length > 10 && ActualProfilename?.length <= 19)
    ProfilefontSize = 7;
  else if (ActualProfilename?.length > 19) ProfilefontSize = 6;

  let DesignationfontSize = 8;
  if (ActualDesignation?.length > 10 && ActualDesignation?.length <= 19)
    DesignationfontSize = 6;
  else if (ActualDesignation?.length > 19) DesignationfontSize = 5;

  const TOOLBAR_HEIGHT = 28;
  const TOOLBAR_WIDTH = 36;
  const toolbarTop = Math.max(0, toolbarPos.y - TOOLBAR_HEIGHT - 6);
  const toolbarLeft = clamp(
    toolbarPos.x + toolbarPos.width / 1 - TOOLBAR_WIDTH / 2,
    0,
    STAGE_WIDTH - TOOLBAR_WIDTH,
  );

  // Credits this export will spend: video (image+music) = 2, image = 1.
  const exportCost = selectedMusic?.file
    ? VIDEO_CREDIT_COST
    : IMAGE_CREDIT_COST;

  // ── Download button label ─────────────────────────────────────────────────
  const downloadBtnLabel = () => {
    if (subLoading) return "Loading...";
    if (exportLoading) return "Exporting...";
    if (!activeSub) return "No Plan";
    if (totalDownloadsAvailable < exportCost) return "Not enough credits";
    return `Download (${totalDownloadsAvailable})`;
  };

  const canExport =
    !subLoading &&
    !exportLoading &&
    activeSub &&
    totalDownloadsAvailable >= exportCost;

  return (
    // Fixed device height so only the template list scrolls (canvas stays put).
    // The TabBar is hidden on the editor route and Layout adds no bottom padding
    // here, so we only subtract the Header (60px). If Header/Layout spacing
    // changes, revisit this value.
    <div className="flex flex-col justify-start items-center w-full h-[calc(100dvh-60px)] overflow-hidden">
      {/* Toast notification */}
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div
        ref={stageContainerRef}
        className="relative mt-2 flex-shrink-0"
        style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT }}
      >
        <Stage
          ref={stageRef}
          width={STAGE_WIDTH}
          height={STAGE_HEIGHT}
          className="bg-background border border-border shadow-lg"
          onMouseDown={handleStageMouseDown}
          onTouchStart={handleStageMouseDown}
        >
          <Layer>
            <Image
              image={bgImage}
              x={0}
              y={0}
              width={STAGE_WIDTH}
              height={STAGE_HEIGHT}
            />
            <Image image={Imagel2} x={3} y={2} width={25} height={25} />
            <Image image={Imagel3} x={260} y={2} width={25} height={25} />
            <Image image={Imagel4} x={290} y={2} width={25} height={25} />

            {/* topupline — auto-centered */}
            {(() => {
              const slots = [
                { img: Imagetop1 },
                { img: Imagetop2 },
                { img: Imagetop3 },
                { img: Imagetop4 },
                { img: Imagetop5 },
                { img: Imagetop6 },
                { img: Imagetop7 },
              ].filter((s) => s.img);
              const SLOT_SIZE = 30;
              const SLOT_PADDING = 4;
              const INNER_SIZE = SLOT_SIZE - SLOT_PADDING * 2;
              const totalWidth = slots.length * SLOT_SIZE;
              const extraOffset = slots.length === 7 ? -10 : 0;
              const startX = (STAGE_WIDTH - totalWidth) / 2 + extraOffset;
              return slots.map((slot, i) => {
                const x = startX + i * SLOT_SIZE;
                return (
                  <React.Fragment key={i}>
                    <Image
                      image={ImagetopFrame}
                      x={x}
                      y={2}
                      width={SLOT_SIZE}
                      height={SLOT_SIZE}
                    />
                    <Group
                      x={x}
                      y={2}
                      clipFunc={(ctx) => {
                        ctx.arc(
                          SLOT_SIZE / 2,
                          SLOT_SIZE / 2,
                          INNER_SIZE / 2,
                          0,
                          Math.PI * 2,
                          false,
                        );
                        ctx.closePath();
                      }}
                    >
                      <Image
                        image={slot.img}
                        x={SLOT_PADDING}
                        y={SLOT_PADDING}
                        width={INNER_SIZE}
                        height={INNER_SIZE}
                        onTap={() => setIsOpen(true)}
                        onClick={() => setIsOpen(true)}
                      />
                    </Group>
                  </React.Fragment>
                );
              });
            })()}

            {isMeeting || isSubGeneralType || isSubGeneralType2 ? null : (
              <Text
                x={
                  isCapping
                    ? isRight
                      ? 24
                      : 162
                    : isIncome
                      ? isRight
                        ? 75
                        : 72
                      : isAnyversary
                        ? isRight
                          ? 7
                          : 138
                        : isAchievement
                          ? 83
                          : isClosing
                            ? isRight
                              ? 83
                              : 78
                            : isWelcome
                              ? isRight
                                ? 15
                                : 140
                              : isBonanza
                                ? isRight
                                  ? 38
                                  : 118
                                : isRight
                                  ? 35
                                  : 127
                }
                y={
                  isCapping
                    ? isRight
                      ? 187
                      : 187
                    : isAnyversary
                      ? isRight
                        ? 155
                        : 155
                      : isAchievement
                        ? 97
                        : isWelcome
                          ? isRight
                            ? 106
                            : 106
                          : isBonanza
                            ? 97
                            : 96
                }
                width={isCapping ? 130 : isAnyversary ? 175 : 165}
                height={5}
                text={`${formname.toUpperCase() || ActualProfilename}`}
                fontSize={isAnyversary ? 8 : 9.5}
                fill="white"
                fontStyle="1000"
                letterSpacing={0.1}
                verticalAlign="middle"
                align="center"
              />
            )}

            {isMeeting || isSubGeneralType || isSubGeneralType2 ? null : (
              <Text
                x={
                  isCapping
                    ? isRight
                      ? 70
                      : 205
                    : isIncome
                      ? isRight
                        ? 75
                        : 135
                      : isAnyversary
                        ? isRight
                          ? 75
                          : 205
                        : isAchievement
                          ? 140
                          : isClosing
                            ? isRight
                              ? 140
                              : 140
                            : isWelcome
                              ? isRight
                                ? 78
                                : 200
                              : isBonanza
                                ? isRight
                                  ? 88
                                  : 180
                                : isRight
                                  ? 98
                                  : 188
                }
                y={
                  isCapping
                    ? isRight
                      ? 197
                      : 197
                    : isAnyversary
                      ? 175
                      : isAchievement
                        ? 112
                        : isWelcome
                          ? isRight
                            ? 123
                            : 125
                          : isBonanza
                            ? isRight
                              ? 110
                              : 110
                            : 112
                }
                width={50}
                height={5}
                text={"FROM/" + `${formcity.toUpperCase() || ""}`}
                fontSize={5}
                fill="white"
                fontStyle="bold"
                letterSpacing={0.1}
                verticalAlign="middle"
                align="center"
              />
            )}

            {isWelcome ? (
              <Image
                image={Imagel2}
                x={isRight ? 70 : 180}
                y={178}
                width={60}
                height={60}
              />
            ) : null}
            {isSubGeneralType ? (
              <Image
                ref={profileImageRef}
                image={ImageProfile}
                x={isRight ? 319.5 : 0.5}
                y={80}
                width={155}
                height={210}
                scaleX={isRight ? -1 : 1}
                offsetX={0}
                draggable
                onClick={handleImageClick("profile")}
                onTap={handleImageClick("profile")}
                onDragEnd={handleDragEnd("profile")}
                onTransformEnd={handleTransformEnd("profile")}
              />
            ) : isSubGeneralType2 || isAchievement ? null : (
              <Image
                ref={rankImageRef}
                image={isMeeting ? ImageChief : ImageRank}
                x={rankAttrs.x}
                y={rankAttrs.y}
                width={rankAttrs.width}
                height={rankAttrs.height}
                scaleX={rankAttrs.scaleX}
                offsetX={rankAttrs.offsetX}
                scaleY={rankAttrs.scaleY} // ← add
                offsetY={rankAttrs.offsetY}
                draggable
                // ADD these 3 props:
                onClick={handleImageClick("rank")}
                onTap={handleImageClick("rank")}
                onDragEnd={handleDragEnd("rank")}
                onTransformEnd={handleTransformEnd("rank")}
              />
            )}

            {isMeeting || isSubGeneralType || isSubGeneralType2 ? null : (
              <Image
                ref={stickerImageRef}
                image={Sticker}
                x={stickerAttrs.x}
                y={stickerAttrs.y}
                width={stickerAttrs.width}
                height={stickerAttrs.height}
                scaleX={stickerAttrs.scaleX}
                offsetX={stickerAttrs.offsetX}
                draggable
                // ADD these 3 props:
                onClick={handleImageClick("sticker")}
                onTap={handleImageClick("sticker")}
                onDragEnd={handleDragEnd("sticker")}
                onTransformEnd={handleTransformEnd("sticker")}
              />
            )}

            {isAchievement ? (
              <Text
                x={110}
                y={232}
                width={130}
                height={30}
                text={String(AchiveName.toUpperCase() || "")}
                fontSize={18}
                fill={`gold`}
                fontStyle="1000"
                letterSpacing={0}
                verticalAlign="center"
                align="center"
              />
            ) : null}

            {isIncome ? (
              <Text
                x={160}
                y={197}
                width={130}
                height={30}
                text={`${incomeDay} ${incomeType.toUpperCase()}`}
                fontSize={18}
                fill={`white`}
                fontStyle="1000"
                letterSpacing={0}
                verticalAlign="center"
                align="center"
              />
            ) : null}

            {/* {isSubGeneralType ||
            isSubGeneralType2 ||
            Template_Type === "Anniversary_Birthday" ||
            Template_Type === "Bonanza" ||
            Template_Type === "Capping" ||
            isWelcome ||
            isMeeting ? null : (
              <Text
                x={
                  isIncome
                    ? isRight
                      ? 5
                      : 135
                    : isClosing
                      ? isRight
                        ? 5
                        : 135
                      : isRight
                        ? 158
                        : 8
                }
                y={isIncome ? 132 : isClosing ? 135 : 250}
                width={isRight ? 180 : 180}
                height={30}
                text={amountText}
                fontSize={isIncome ? 26 : isClosing ? 30 : 28}
                fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                fillLinearGradientEndPoint={{ x: isRight ? 180 : 180, y: 0 }}
                fillLinearGradientColorStops={selectedAmountOption?.stops || []}
                fontStyle="1000"
                letterSpacing={0}
                verticalAlign="start"
                align={isRight ? "center" : "start"}
                onClick={() => setIsAmountModalOpen(true)}
                onTap={() => setIsAmountModalOpen(true)}
              />
            )}
 */}
            {isSubGeneralType ||
            isSubGeneralType2 ||
            Template_Type === "Anniversary_Birthday" ||
            Template_Type === "Bonanza" ||
            Template_Type === "Capping" ||
            isWelcome ||
            isMeeting ? null : (
              <GoldenAmountImages
                amountText={amountText}
                digitImageMap={digitImageMap}
                startX={
                  isIncome
                    ? isRight
                      ? 5
                      : 135
                    : isClosing
                      ? isRight
                        ? 5
                        : 135
                      : isRight
                        ? charslen.length === 7
                          ? 180
                          : charslen.length === 6
                            ? 200
                            : charslen.length === 5
                              ? 210
                              : 158
                        : 8
                }
                y={isIncome ? 132 : isClosing ? 135 : 250}
                digitHeight={isIncome ? 26 : isClosing ? 30 : 28}
                spacing={0.6}
              />
            )}

            {isIncome ? (
              <Group x={170} y={107}>
                <Image
                  x={10}
                  y={120}
                  width={50}
                  height={50}
                  image={MainIncomeProof}
                />
                <Image
                  x={5}
                  y={115}
                  width={60}
                  height={60}
                  image={AchiveFrame}
                />
              </Group>
            ) : null}

            {isAchievement ? (
              <Image
                rotationDeg={-10}
                x={10}
                y={120}
                width={40}
                height={40}
                image={Imagef1}
              />
            ) : null}
            {isAchievement ? (
              <Image
                rotationDeg={10}
                x={265}
                y={115}
                width={40}
                height={40}
                image={Imagef2}
              />
            ) : null}

            {isAchievement ? (
              <Image
                rotationDeg={10}
                x={265}
                y={175}
                width={40}
                height={40}
                image={Imagef3}
              />
            ) : null}
            {isAchievement ? (
              <Group x={76} y={120} width={200} height={100}>
                <Image width={165} height={90} image={MainAchieveImage} />
                <Image
                  width={182}
                  x={-2}
                  y={-2}
                  height={110}
                  image={AchiveFrame}
                />
              </Group>
            ) : null}
            {isMeeting ? (
              <>
                <Text
                  x={isRight ? -13 : 135}
                  y={175}
                  width={200}
                  height={30}
                  text={meetingData?.chiefName.toUpperCase()}
                  fontSize={13}
                  fontStyle="1000"
                  fill={`white`}
                  letterSpacing={0}
                  verticalAlign="center"
                  align={"center"}
                ></Text>
                <Text
                  x={isRight ? -13 : 135}
                  y={190}
                  width={200}
                  height={30}
                  text={meetingData?.chiefDesignation.toUpperCase()}
                  fontSize={9}
                  fontStyle="500"
                  fill={`white`}
                  letterSpacing={0}
                  verticalAlign="center"
                  align={"center"}
                ></Text>
              </>
            ) : null}

            {isMeeting ? (
              isRight ? (
                <Group x={50} y={210}>
                  <Text
                    x={0}
                    y={1}
                    text={meetingData?.date}
                    fontSize={13}
                    fontStyle="1000"
                    fill={`white`}
                    letterSpacing={0}
                    verticalAlign="start"
                    align={"start"}
                  ></Text>
                  <Text
                    x={0}
                    y={21}
                    text={meetingData?.time}
                    fontSize={13}
                    fontStyle="1000"
                    fill={`white`}
                    letterSpacing={0}
                    verticalAlign="start"
                    align={"start"}
                  ></Text>
                </Group>
              ) : (
                <Group x={190} y={210}>
                  <Text
                    x={0}
                    y={3}
                    text={meetingData?.date}
                    fontSize={13}
                    fontStyle="1000"
                    fill={`white`}
                    letterSpacing={0}
                    verticalAlign="end"
                    align={"end"}
                  ></Text>
                  <Text
                    x={0}
                    y={21}
                    text={meetingData?.time}
                    fontSize={13}
                    fontStyle="1000"
                    fill={`white`}
                    letterSpacing={0}
                    verticalAlign="end"
                    align={"end"}
                  ></Text>
                </Group>
              )
            ) : null}
            {meetingData?.hostMode === "add" && isMeeting ? (
              <Group X={isRight ? 5 : 100} Y={0.9}>
                <Text
                  x={20}
                  y={285.5}
                  width={180}
                  height={30}
                  text={meetingData?.hostName.toUpperCase()}
                  fontSize={8}
                  fontStyle="1000"
                  fill={`white`}
                  letterSpacing={0}
                  verticalAlign="center"
                  align={"center"}
                ></Text>
                <Text
                  x={20}
                  y={295}
                  width={180}
                  height={30}
                  text={ActualDesignation}
                  fontSize={6}
                  fontStyle="1000"
                  fill={`white`}
                  letterSpacing={0}
                  verticalAlign="center"
                  align={"center"}
                ></Text>
                <Text
                  x={20}
                  y={303}
                  width={180}
                  height={30}
                  text={`+91${profileMobile}` || "+91XXXXXXXXXX"}
                  fontSize={6}
                  fontStyle="1000"
                  fill={`white`}
                  letterSpacing={0}
                  verticalAlign="center"
                  align={"center"}
                ></Text>
              </Group>
            ) : null}
            {isMeeting ? null : isRight ? (
              <Image
                scaleX={-1}
                scaleY={1}
                image={Imagefooter}
                x={320}
                y={280}
                width={350}
                height={41}
                onClick={() => setIsOpenFtr(true)}
                onTap={() => setIsOpenFtr(true)}
              />
            ) : (
              <Image
                image={Imagefooter}
                x={0}
                y={280}
                width={350}
                height={41}
                onClick={() => setIsOpenFtr(true)}
                onTap={() => setIsOpenFtr(true)}
              />
            )}
            {isMeeting ? (
              meetingData?.meetingMode === "online" ? (
                meetingData?.platformType === "instagram" ||
                meetingData?.platformType === "youtube" ||
                meetingData?.platformType === "facebook" ? (
                  <Group x={isRight ? 135 : 0} y={285}>
                    <Image
                      image={
                        meetingData?.platformType === "instagram"
                          ? insta
                          : meetingData?.platformType === "youtube"
                            ? yt
                            : meetingData?.platformType === "facebook"
                              ? fb
                              : null
                      }
                      x={isRight ? 0 : 10}
                      y={0}
                      width={25}
                      height={25}
                    />
                    <Text
                      x={isRight ? 35 : 45}
                      y={5}
                      text={meetingData?.platformInput}
                      fontSize={12}
                      fontStyle="1000"
                      fill={`white`}
                      letterSpacing={0}
                      verticalAlign="start"
                      align={"start"}
                    ></Text>
                  </Group>
                ) : (
                  <Group x={isRight ? 135 : 0} y={285}>
                    <Image
                      image={
                        meetingData?.platformType === "zoom"
                          ? zooml
                          : meetingData?.platformType === "meet"
                            ? meetl
                            : null
                      }
                      x={isRight ? 0 : 10}
                      y={0}
                      width={25}
                      height={25}
                    />
                    <Text
                      x={isRight ? 35 : 45}
                      y={4}
                      text={meetingData?.meetingId}
                      fontSize={9}
                      fontStyle="1000"
                      fill={`white`}
                      letterSpacing={0}
                      verticalAlign="start"
                      align={"start"}
                    ></Text>
                    <Text
                      x={isRight ? 35 : 45}
                      y={15}
                      text={meetingData?.meetingPassword}
                      fontSize={9}
                      fontStyle="1000"
                      fill={`white`}
                      letterSpacing={0}
                      verticalAlign="start"
                      align={"start"}
                    ></Text>
                  </Group>
                )
              ) : (
                <Group x={isRight ? 140 : 15} y={285}>
                  <Image
                    image={locl}
                    x={isRight ? 0 : 0}
                    y={0}
                    width={25}
                    height={25}
                  />
                  <Text
                    x={30}
                    y={5}
                    text={meetingData?.address1}
                    fontSize={10}
                    fontStyle="1000"
                    fontVariant="italic"
                    fill={`white`}
                    letterSpacing={0}
                    verticalAlign="center"
                    align={"center"}
                  ></Text>
                  <Text
                    x={30}
                    y={15}
                    text={meetingData?.address2}
                    fontSize={7.5}
                    fontStyle="1000"
                    fontVariant="italic"
                    fill={`white`}
                    letterSpacing={0}
                    verticalAlign="end"
                    align={"end"}
                  ></Text>
                </Group>
              )
            ) : null}

            {isMeeting && meetingData?.hostMode === "none" ? (
              <Group x={isRight ? 0 : 240} y={298}>
                <Text
                  x={3}
                  y={0}
                  text={"For More Details Contact On :-"}
                  fontSize={5.5}
                  fontStyle="1000"
                  fontVariant="italic"
                  fill={`white`}
                  letterSpacing={0}
                  verticalAlign="center"
                  align={"center"}
                ></Text>
                <Text
                  x={12}
                  y={6}
                  text={`+91${profileMobile}` || "+91XXXXXXXXXX"}
                  fontSize={7.5}
                  fontStyle="1000"
                  fill={`white`}
                  letterSpacing={0}
                  verticalAlign="end"
                  align={"end"}
                ></Text>
              </Group>
            ) : null}

            {isMeeting ? null : isRight ? (
              <>
                {/* <Text
                  x={195}
                  y={295}
                  width={150}
                  height={5}
                  text="CALL FOR ASSOCIATION"
                  fontSize={7}
                  fill="white"
                  fontStyle="bold"
                  verticalAlign="middle"
                  onClick={() => setIsOpenFtr(true)}
                  onTap={() => setIsOpenFtr(true)}
                /> */}
                <Text
                  x={240}
                  y={298}
                  width={150}
                  height={5}
                  text="CALL FOR ASSOCIATION"
                  fontSize={4.5}
                  fill="white"
                  fontStyle="bold"
                  verticalAlign="middle"
                  onClick={() => setIsOpenFtr(true)}
                  onTap={() => setIsOpenFtr(true)}
                />
                {/* <Text
                  x={190}
                  y={297}
                  width={150}
                  height={20}
                  text={`+91${profileMobile}` || "+91XXXXXXXXXX"}
                  fontSize={12}
                  fill="white"
                  fontStyle="bold"
                  verticalAlign="middle"
                  onClick={() => setIsOpenFtr(true)}
                  onTap={() => setIsOpenFtr(true)}
                /> */}
                <Text
                  x={235}
                  y={297}
                  width={150}
                  height={20}
                  text={`+91${profileMobile}` || "+91XXXXXXXXXX"}
                  fontSize={7.5}
                  fill="white"
                  fontStyle="bold"
                  verticalAlign="middle"
                  onClick={() => setIsOpenFtr(true)}
                  onTap={() => setIsOpenFtr(true)}
                />
                {(() => {
                  let iconX = 0;
                  const iconPositions = {};
                  if (SocialURLs.Youtube) {
                    iconPositions.youtube = iconX;
                    iconX += 7;
                  }
                  if (SocialURLs.Instagram) {
                    iconPositions.instagram = iconX;
                    iconX += 7;
                  }
                  if (SocialURLs.Facebook) {
                    iconPositions.facebook = iconX;
                    iconX += 7;
                  }
                  if (SocialURLs.X) {
                    iconPositions.x = iconX;
                    iconX += 7;
                  }
                  const textStartX = iconX + 3;
                  const socialGroupWidth = socialText
                    ? textStartX + socialText.length * 3.5
                    : 0;
                  const parentWidth = 300;
                  const parentCenterX = isSubGeneralType
                    ? 140 - parentWidth / 2
                    : 170 - parentWidth / 2;

                  return (
                    <Group x={parentCenterX} y={295}>
                      {/* <Text
                        x={0}
                        y={showSocial === "no" ? 4 : 0}
                        width={200}
                        height={2}
                        text={ActualProfilename}
                        fontSize={8}
                        fill="white"
                        fontStyle="1000"
                        align="center"
                        verticalAlign="middle"
                        onClick={() => setIsOpenFtr(true)}
                        onTap={() => setIsOpenFtr(true)}
                      /> */}
                      <Text
                        x={30}
                        y={showSocial === "no" ? 0 : 0}
                        width={200}
                        height={2}
                        text={ActualProfilename}
                        fontSize={10.5}
                        fill="white"
                        fontStyle="1000"
                        align="center"
                        verticalAlign="middle"
                        onClick={() => setIsOpenFtr(true)}
                        onTap={() => setIsOpenFtr(true)}
                      />
                      {/* <Text
                        x={0}
                        y={showSocial === "no" ? 13 : 8}
                        width={200}
                        height={2}
                        text={ActualDesignation}
                        fontSize={6}
                        fill="white"
                        fontStyle="bold"
                        align="center"
                        verticalAlign="middle"
                        onClick={() => setIsOpenFtr(true)}
                        onTap={() => setIsOpenFtr(true)}
                      /> */}
                      <Text
                        x={30}
                        y={showSocial === "no" ? 10.5 : 9.5}
                        width={200}
                        height={2}
                        text={ActualDesignation}
                        fontSize={6.5}
                        fill="white"
                        fontStyle="bold"
                        align="center"
                        verticalAlign="middle"
                        onClick={() => setIsOpenFtr(true)}
                        onTap={() => setIsOpenFtr(true)}
                      />
                      {showSocial === "never" ? (
                        <Group x={(200 - socialGroupWidth) / 2} y={12}>
                          {SocialURLs.Youtube && (
                            <Image
                              image={yt}
                              x={iconPositions.youtube}
                              y={0}
                              width={9}
                              height={9}
                            />
                          )}
                          {SocialURLs.Instagram && (
                            <Image
                              image={insta}
                              x={iconPositions.instagram}
                              y={0}
                              width={9}
                              height={9}
                            />
                          )}
                          {SocialURLs.Facebook && (
                            <Image
                              image={fb}
                              x={iconPositions.facebook}
                              y={0}
                              width={9}
                              height={9}
                            />
                          )}
                          {SocialURLs.X && (
                            <Image
                              image={xlogo}
                              x={iconPositions.x}
                              y={0}
                              width={9}
                              height={9}
                            />
                          )}
                          <Text
                            x={textStartX}
                            y={0}
                            width={100 - textStartX}
                            height={9}
                            text={socialText}
                            fontSize={6}
                            fill="white"
                            fontStyle="bold"
                            align="left"
                            verticalAlign="middle"
                            onClick={() => setIsOpenFtr(true)}
                            onTap={() => setIsOpenFtr(true)}
                          />
                        </Group>
                      ) : null}
                    </Group>
                  );
                })()}
              </>
            ) : (
              <>
                {/* <Text
                  x={43}
                  y={295}
                  width={150}
                  height={5}
                  text="CALL FOR ASSOCIATION"
                  fontSize={7}
                  fill="white"
                  fontStyle="bold"
                  verticalAlign="middle"
                  onClick={() => setIsOpenFtr(true)}
                  onTap={() => setIsOpenFtr(true)}
                />
                <Text
                  x={39}
                  y={297}
                  width={150}
                  height={20}
                  text={`+91${profileMobile}` || "+91XXXXXXXXXX"}
                  fontSize={12}
                  fill="white"
                  fontStyle="bold"
                  verticalAlign="middle"
                  onClick={() => setIsOpenFtr(true)}
                  onTap={() => setIsOpenFtr(true)}
                /> */}

                <Text
                  x={30}
                  y={298}
                  width={150}
                  height={5}
                  text="CALL FOR ASSOCIATION"
                  fontSize={4.5}
                  fill="white"
                  fontStyle="bold"
                  verticalAlign="middle"
                  onClick={() => setIsOpenFtr(true)}
                  onTap={() => setIsOpenFtr(true)}
                />
                <Text
                  x={28}
                  y={297}
                  width={150}
                  height={20}
                  text={`+91${profileMobile}` || "+91XXXXXXXXXX"}
                  fontSize={7.5}
                  fill="white"
                  fontStyle="bold"
                  verticalAlign="middle"
                  onClick={() => setIsOpenFtr(true)}
                  onTap={() => setIsOpenFtr(true)}
                />

                {(() => {
                  let iconX = 0;
                  const iconPositions = {};
                  if (SocialURLs.Youtube) {
                    iconPositions.youtube = iconX;
                    iconX += 10;
                  }
                  if (SocialURLs.Instagram) {
                    iconPositions.instagram = iconX;
                    iconX += 10;
                  }
                  if (SocialURLs.Facebook) {
                    iconPositions.facebook = iconX;
                    iconX += 10;
                  }
                  if (SocialURLs.X) {
                    iconPositions.x = iconX;
                    iconX += 10;
                  }
                  const textStartX = iconX + 2;
                  const socialGroupWidth = socialText
                    ? textStartX + socialText.length * 3.5
                    : 0;
                  const parentWidth = 300;
                  const parentCenterX = isSubGeneralType
                    ? 285 - parentWidth / 2
                    : 216 - parentWidth / 2;

                  return (
                    <Group x={parentCenterX} y={295}>
                      {/* <Text
                        x={0}
                        y={showSocial === "no" ? 4 : 0}
                        width={200}
                        height={2}
                        text={ActualProfilename}
                        fontSize={8}
                        fill="white"
                        fontStyle="1000"
                        align="center"
                        verticalAlign="middle"
                        onClick={() => setIsOpenFtr(true)}
                        onTap={() => setIsOpenFtr(true)}
                      />
                      <Text
                        x={0}
                        y={showSocial === "no" ? 13 : 8}
                        width={200}
                        height={2}
                        text={ActualDesignation}
                        fontSize={6}
                        fill="white"
                        fontStyle="bold"
                        align="center"
                        verticalAlign="middle"
                        onClick={() => setIsOpenFtr(true)}
                        onTap={() => setIsOpenFtr(true)}
                      /> */}
                      <Text
                        x={0}
                        y={showSocial === "no" ? 0 : 0}
                        width={200}
                        height={2}
                        text={ActualProfilename}
                        fontSize={10.5}
                        fill="white"
                        fontStyle="1000"
                        align="center"
                        verticalAlign="middle"
                        onClick={() => setIsOpenFtr(true)}
                        onTap={() => setIsOpenFtr(true)}
                      />
                      <Text
                        x={0}
                        y={showSocial === "no" ? 10.5 : 9.5}
                        width={200}
                        height={2}
                        text={ActualDesignation}
                        fontSize={6.5}
                        fill="white"
                        fontStyle="bold"
                        align="center"
                        verticalAlign="middle"
                        onClick={() => setIsOpenFtr(true)}
                        onTap={() => setIsOpenFtr(true)}
                      />
                      {showSocial === "never"
                        ? socialText && (
                            <Group x={(200 - socialGroupWidth) / 2} y={12}>
                              {SocialURLs.Youtube && (
                                <Image
                                  image={yt}
                                  x={iconPositions.youtube}
                                  y={0}
                                  width={9}
                                  height={9}
                                />
                              )}
                              {SocialURLs.Instagram && (
                                <Image
                                  image={insta}
                                  x={iconPositions.instagram}
                                  y={0}
                                  width={9}
                                  height={9}
                                />
                              )}
                              {SocialURLs.Facebook && (
                                <Image
                                  image={fb}
                                  x={iconPositions.facebook}
                                  y={0}
                                  width={9}
                                  height={9}
                                />
                              )}
                              {SocialURLs.X && (
                                <Image
                                  image={xlogo}
                                  x={iconPositions.x}
                                  y={0}
                                  width={9}
                                  height={9}
                                />
                              )}
                              <Text
                                x={textStartX}
                                y={0}
                                width={100 - textStartX}
                                height={9}
                                text={socialText}
                                fontSize={6}
                                fill="white"
                                fontStyle="bold"
                                align="left"
                                verticalAlign="middle"
                                onClick={() => setIsOpenFtr(true)}
                                onTap={() => setIsOpenFtr(true)}
                              />
                            </Group>
                          )
                        : null}
                    </Group>
                  );
                })()}
              </>
            )}

            {isSubGeneralType ||
            meetingData?.hostMode === "none" ? null : isRight ? (
              <Image
                image={ImageProfile}
                x={isMeeting ? 60 : 76}
                y={isMeeting ? 250 : 210}
                scaleX={-1}
                width={isMeeting ? 60 : 80}
                height={isMeeting ? 70 : 110}
              />
            ) : (
              <Image
                image={ImageProfile}
                x={isMeeting ? 260 : 244}
                y={isMeeting ? 250 : 210}
                width={isMeeting ? 60 : 80}
                height={isMeeting ? 70 : 110}
              />
            )}

            <Transformer
              ref={transformerRef}
              keepRatio={false}
              rotateEnabled={false}
              boundBoxFunc={boundBoxFunc}
              enabledAnchors={[
                "top-left",
                "top-right",
                "bottom-left",
                "bottom-right",
                "middle-left",
                "middle-right",
                "top-center",
                "bottom-center",
              ]}
              anchorFill="#6366f1"
              anchorStroke="#fff"
              anchorSize={8}
              borderStroke="#6366f1"
              borderStrokeWidth={1.5}
              borderDash={[4, 3]}
            />
          </Layer>
        </Stage>
      </div>

      {isAmountModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setIsAmountModalOpen(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 24,
              padding: 20,
              width: "92%",
              maxWidth: 420,
              boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>
                  Amount Graphics
                </div>
              </div>
              <button
                onClick={() => setIsAmountModalOpen(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 22,
                  cursor: "pointer",
                  color: "#334155",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              {AMOUNT_GRADIENT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setAmountPatternId(option.id);
                    setIsAmountModalOpen(false);
                  }}
                  style={{
                    cursor: "pointer",
                    border:
                      option.id === amountPatternId
                        ? "2px solid #2563eb"
                        : "1px solid #d1d5db",
                    borderRadius: 16,
                    padding: 10,
                    background: "white",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: 70,
                      borderRadius: 14,
                      background: option.preview,
                      overflow: "hidden",
                      boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.16)",
                    }}
                  />
                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#111827",
                    }}
                  >
                    {option.name}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="flex lg:w-1/3 w-full flex-row gap-2 justify-between items-center mt-2 flex-shrink-0 px-1">
        <div className="flex flex-row justify-start items-center flex-1 min-w-0 h-[40px] ml-3 overflow-x-auto hide-scrollbar">
          {mlmProfile?.profileImageURLs?.map((img, index) => (
            <img
              key={index}
              src={img}
              onClick={() => setmiddaleImage(img)}
              className={`w-[35px] h-[35px] object-contain cursor-pointer transition-all flex-shrink-0
                ${middaleImage === img ? "border-2 border-accent rounded" : ""}`}
            />
          ))}
        </div>

        {/* Music toggle + Download button */}
        <div className="flex flex-row items-center gap-2 mr-3 flex-shrink-0">
          {/* Music toggle — compact icon button next to download to save space */}
          <button
            title={selectedMusic ? `Music: ${selectedMusic.name}` : "Add background music"}
            onClick={() => setMusicModalOpen(true)}
            className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-all flex-shrink-0 ${
              selectedMusic
                ? "bg-green-500 text-white shadow-md"
                : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
            {selectedMusic && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center">
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                  <polyline points="1.5,5 4,7.5 8.5,2.5" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            )}
          </button> 
          {/* Refer credits badge */}
          {/* {referCredits > 0 && (
            <span
              style={{
                background: "#f59e0b",
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 7px",
                borderRadius: 20,
              }}
            >
              +{referCredits} refer
            </span>
          )} */}
          <Button
            size="sm"
            onClick={selectedMusic ? handleExportWithMusic : handleExport}
            disabled={!canExport || musicExporting}
            style={{
              opacity: canExport ? 1 : 0.5,
              minWidth: 110,
              position: "relative",
            }}
          >
            {exportLoading ? (
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg
                  style={{ animation: "spin 1s linear infinite" }}
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Exporting...
              </span>
            ) : subLoading ? (
              "Loading..."
            ) : (
              downloadBtnLabel()
            )}
          </Button>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* ── Music selection modal ──────────────────────────────────────────── */}
      {musicModalOpen && (
        <div
          className="fixed inset-0 z-[600] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm"
          onClick={() => setMusicModalOpen(false)}
        >
          <div
            className="bg-background dark:bg-[#141824] w-full sm:w-[92vw] sm:max-w-[420px] rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl max-h-[85vh] overflow-y-auto p-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-foreground">Add Music</h3>
              <button
                onClick={() => setMusicModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
                aria-label="Close"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Tracks are trimmed to 20 seconds for a quick, lightweight video.
            </p>

            {/* Currently selected */}
            {selectedMusic && (
              <div className="flex items-center justify-between gap-3 mb-4 p-3 rounded-2xl bg-green-500/10 border border-green-500/30">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-500 text-white flex-shrink-0">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  </span>
                  <span className="text-sm font-medium text-foreground truncate">
                    {selectedMusic.name}
                  </span>
                </div>
                <button
                  onClick={handleRemoveMusic}
                  className="text-xs font-semibold text-danger hover:underline flex-shrink-0"
                >
                  Remove
                </button>
              </div>
            )}

            {/* Upload from device */}
            <button
              onClick={() => musicInputRef.current?.click()}
              disabled={deviceLoading}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-colors mb-4 ${
                deviceLoading
                  ? "border-accent bg-accent/5 opacity-80 cursor-wait"
                  : "border-border hover:border-accent hover:bg-accent/5"
              }`}
            >
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10 text-accent flex-shrink-0">
                {deviceLoading ? (
                  <svg
                    className="animate-spin"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                  </svg>
                )}
              </span>
              <span className="text-left">
                <span className="block text-sm font-semibold text-foreground">
                  {deviceLoading ? "Processing audio..." : "Upload from device"}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {deviceLoading
                    ? "Reading your track, please wait"
                    : "Pick an audio file from your phone"}
                </span>
              </span>
            </button>

            {/* Preset tracks */}
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Choose a track
            </div>
            {PRESET_AUDIOS.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6 px-3 rounded-2xl border border-dashed border-border">
                More tracks coming soon.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {PRESET_AUDIOS.map((preset) => {
                  const isActive = selectedMusic?.name === preset.name;
                  const isLoading = presetLoadingUrl === preset.url;
                  return (
                    <button
                      key={preset.url}
                      onClick={() => handlePresetMusic(preset)}
                      disabled={isLoading}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-colors text-left ${
                        isActive
                          ? "border-accent bg-accent/10"
                          : "border-border hover:border-accent hover:bg-accent/5"
                      } ${isLoading ? "opacity-60" : ""}`}
                    >
                      <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10 text-accent flex-shrink-0">
                        {isLoading ? (
                          <svg
                            className="animate-spin"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="3"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                        ) : (
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M9 18V5l12-2v13" />
                            <circle cx="6" cy="18" r="3" />
                            <circle cx="18" cy="16" r="3" />
                          </svg>
                        )}
                      </span>
                      <span className="text-sm font-medium text-foreground truncate flex-1">
                        {preset.name}
                      </span>
                      {isActive && (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-accent flex-shrink-0"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden music file input — triggered by the compact music toggle near the download button */}
      <input
        ref={musicInputRef}
        type="file"
        accept="audio/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleDeviceMusic(file);
          e.target.value = "";
        }}
      />

      {/* ── FFmpeg progress overlay ─────────────────────────────────────────── */}
      {musicExporting && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="relative bg-background dark:bg-[#141824] rounded-3xl p-7 w-[88vw] max-w-[380px] shadow-2xl border border-border">
            {/* Icon */}
            <div className="flex items-center justify-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-accent animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              </div>
            </div>
            <h3 className="text-[16px] font-bold text-foreground text-center mb-1">
              Creating Video
            </h3>
            <p className="text-[12px] text-muted-foreground text-center mb-5">
              {progressLabel || "Processing..."}
            </p>
            {/* Progress bar */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-muted-foreground">
                  Progress
                </span>
                <span className="text-[12px] font-bold text-accent tabular-nums">
                  {displayProgress}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-muted/40 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${displayProgress}%`,
                    background: "linear-gradient(90deg, #0e245c, #4f6fd0)",
                  }}
                />
              </div>
            </div>
            {/* Logs */}
            {progressLogs.length > 0 && (
              <div className="bg-black/20 dark:bg-black/40 rounded-xl p-3 space-y-0.5 max-h-[60px] overflow-hidden">
                {progressLogs.slice(-3).map((l, i) => (
                  <p
                    key={i}
                    className="text-[10px] text-muted-foreground/60 font-mono truncate"
                  >
                    {l}
                  </p>
                ))}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground/50 text-center mt-3">
              Do not close this screen
            </p>
          </div>
        </div>
      )}

      {/* ── AI retouch modal (shown after a successful image export) ─────────── */}
      {/* {exportedUri && (
        <AiRetouchModal
          imageUri={exportedUri}
          onClose={() => setExportedUri(null)}
          onToast={showToast}
        />
      )} */}

      {/* Template list fills the remaining device height and scrolls internally,
          while the canvas above stays fixed (non-scrollable). */}
      <div className="w-full lg:w-1/3 flex-1 min-h-0 flex flex-col overflow-hidden">
        <ListOfTemplates selected={selected} setSelected={setSelected} />
      </div>
    </div>
  );
}

export default GeneralEditPage;
