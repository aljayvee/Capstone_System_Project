import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  UserCog,
  Camera,
  Loader2,
  Mail,
  Phone,
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  CircleCheck,
  Circle,
  CheckCircle2,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { apiClient } from "../../../services/apiClient";
import { fetchStaffPhoto, uploadStaffPhoto, deleteStaffPhoto } from "../../../services/staffPhotoService";
import { DispatcherCard } from "./ui/DispatcherCard";
import { DispatcherButton } from "./ui/DispatcherButton";
import {
  PASSWORD_RULES,
  PH_MOBILE_LENGTH,
  sanitizePhoneInput,
  validateConfirmPassword,
  validateEmail,
  validateName,
  validatePassword,
  validatePhone,
} from "../../../utils/userValidation";

/** The server's cap, mirrored here so a dispatcher is told before the upload, not after. */
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
/** Long edge, in pixels. A phone/webcam photo is far larger than an avatar needs. */
const AVATAR_MAX_DIMENSION = 1024;

interface StaffProfile {
  username: string;
  role: string;
  status: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  createdAt: string;
  photoUpdatedAt: string | null;
}

type FieldErrors = Record<string, string | null | undefined>;

// Resized and re-encoded before it is measured, the same way the Rider mobile
// app's ProfileScreen does it — a straight-from-camera photo routinely
// exceeds the 5MB cap, so without this step an ordinary picture gets rejected.
function resizeImageFile(file: File): Promise<{ dataUri: string; byteSize: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("That file could not be read."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file could not be read as an image."));
      img.onload = () => {
        const scale = Math.min(1, AVATAR_MAX_DIMENSION / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Your browser does not support image resizing."));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL("image/jpeg", 0.8);
        const byteSize = Math.ceil(((dataUri.length - dataUri.indexOf(",") - 1) * 3) / 4);
        resolve({ dataUri, byteSize });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function DispatcherProfilePanel() {
  const { user, token, login } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [infoErrors, setInfoErrors] = useState<FieldErrors>({});
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");
  const [infoError, setInfoError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<FieldErrors>({});
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    setLoadingProfile(true);
    try {
      const res = await apiClient.get(`/riders/profile/${user.id}`);
      const data: StaffProfile = res.data?.user ?? res.data?.rider ?? res.data;
      setProfile(data);
      setFirstName(data.firstName || "");
      setLastName(data.lastName || "");
      setEmail(data.email || "");
      setPhone(data.phone || "");
      setPhotoUri(data.photoUpdatedAt ? await fetchStaffPhoto(user.id) : null);
    } catch (err) {
      console.warn("Failed to load dispatcher profile:", err);
    } finally {
      setLoadingProfile(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const initials = (user?.name || "Dispatcher")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user?.id) return;

    setPhotoError("");
    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      setPhotoError("Only JPEG and PNG images are supported.");
      return;
    }

    setPhotoBusy(true);
    try {
      const { dataUri, byteSize } = await resizeImageFile(file);
      if (byteSize > MAX_PHOTO_BYTES) {
        setPhotoError("That picture is too large. Try a smaller photo.");
        return;
      }
      await uploadStaffPhoto(user.id, {
        photoData: dataUri,
        mimeType: "image/jpeg",
        fileSize: byteSize,
        fileName: file.name,
      });
      setPhotoUri(dataUri);
    } catch (err: any) {
      setPhotoError(err?.response?.data?.error || err?.message || "Your picture could not be saved.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!user?.id) return;
    setPhotoBusy(true);
    setPhotoError("");
    try {
      await deleteStaffPhoto(user.id);
      setPhotoUri(null);
    } catch (err: any) {
      setPhotoError(err?.response?.data?.error || err?.message || "Could not remove your picture.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleSaveInfo = async () => {
    const errors: FieldErrors = {
      firstName: validateName(firstName, "First name"),
      lastName: validateName(lastName, "Last name"),
      email: validateEmail(email),
      phone: validatePhone(phone),
    };
    setInfoErrors(errors);
    setInfoMessage("");
    setInfoError("");
    if (Object.values(errors).some(Boolean)) return;
    if (!user?.id) return;

    setInfoSaving(true);
    try {
      const res = await apiClient.put(`/users/profile/${user.id}`, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });
      const updated = res.data?.user;
      setInfoMessage("Your account info was saved.");
      // Refreshes the sidebar's name/email immediately — login() is the only
      // path that both updates AuthContext state and persists to
      // sessionStorage, so it's reused here rather than duplicated. The
      // current token is passed explicitly rather than relying on it
      // surviving the spread, so this can never accidentally sign anyone out.
      login(
        {
          ...user,
          firstName: updated?.firstName ?? firstName.trim(),
          lastName: updated?.lastName ?? lastName.trim(),
          name: updated?.fullName || `${firstName.trim()} ${lastName.trim()}`.trim(),
          email: updated?.email ?? email.trim(),
          phone: updated?.phone ?? phone.trim(),
        },
        token || undefined
      );
      loadProfile();
    } catch (err: any) {
      setInfoError(err?.response?.data?.message || err?.response?.data?.error || "Could not save your changes.");
    } finally {
      setInfoSaving(false);
    }
  };

  const handleChangePassword = async () => {
    const errors: FieldErrors = {
      currentPassword: currentPassword ? null : "Enter your current password.",
      newPassword: validatePassword(newPassword),
    };
    if (!errors.newPassword) {
      errors.confirmPassword = validateConfirmPassword(newPassword, confirmPassword);
    }
    setPasswordErrors(errors);
    setPasswordMessage("");
    setPasswordError("");
    if (Object.values(errors).some(Boolean)) return;
    if (!user?.id) return;

    setPasswordSaving(true);
    try {
      await apiClient.put(`/users/password/${user.id}`, { currentPassword, newPassword });
      setPasswordMessage("Your password was updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(err?.response?.data?.error || err?.response?.data?.message || "Could not update your password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const inputClass = (hasError?: string | null) =>
    `w-full bg-slate-50 border rounded-xl py-2.5 px-3.5 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none transition duration-150 focus:bg-white ${
      hasError
        ? "border-red-300 focus:ring-2 focus:ring-red-400/30 focus:border-red-500 bg-red-50/30"
        : "border-slate-200 focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F]"
    }`;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2.5">
        <span className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
          <UserCog size={20} />
        </span>
        <h1 className="text-xl font-extrabold text-slate-800">Profile & Account Settings</h1>
      </div>

      {/* AVATAR */}
      <DispatcherCard padding="lg">
        <div className="flex items-center gap-5">
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-blue-600 flex items-center justify-center text-white text-xl font-black shrink-0">
            {photoBusy ? (
              <Loader2 className="animate-spin" size={22} />
            ) : photoUri ? (
              <img src={photoUri} alt="Your profile" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-extrabold text-slate-900 truncate">{user?.name || "Dispatcher"}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2.5">
              <DispatcherButton
                size="sm"
                variant="secondary"
                icon={<Camera size={13} />}
                onClick={() => fileInputRef.current?.click()}
                disabled={photoBusy}
              >
                Change Photo
              </DispatcherButton>
              {photoUri && (
                <DispatcherButton
                  size="sm"
                  variant="danger-ghost"
                  icon={<Trash2 size={13} />}
                  onClick={handleRemovePhoto}
                  disabled={photoBusy}
                >
                  Remove
                </DispatcherButton>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              className="hidden"
              onChange={handlePhotoChange}
            />
            {photoError && <p className="mt-1.5 text-[11px] font-semibold text-red-600">{photoError}</p>}
          </div>
        </div>
      </DispatcherCard>

      {/* ACCOUNT DETAILS TABLE */}
      <DispatcherCard padding="lg">
        <DispatcherCard.Header eyebrow="ACCOUNT" title="Account Details" />
        {loadingProfile ? (
          <div className="flex items-center justify-center py-6 text-slate-400">
            <Loader2 className="animate-spin" size={18} />
          </div>
        ) : (
          <table className="w-full text-xs">
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-2.5 pr-4 text-slate-500 font-semibold w-1/3">Username</td>
                <td className="py-2.5 font-mono text-slate-800">{profile?.username ?? "—"}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2.5 pr-4 text-slate-500 font-semibold">Role</td>
                <td className="py-2.5 font-bold text-slate-800 capitalize">{(profile?.role || "—").toLowerCase()}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2.5 pr-4 text-slate-500 font-semibold">Status</td>
                <td className="py-2.5">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      profile?.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {profile?.status ?? "—"}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 text-slate-500 font-semibold">Member Since</td>
                <td className="py-2.5 text-slate-800">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—"}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </DispatcherCard>

      {/* PERSONAL INFO */}
      <DispatcherCard padding="lg">
        <DispatcherCard.Header eyebrow="PROFILE" title="Personal Information" />
        {infoError && (
          <div className="flex items-start gap-2 p-3 mb-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>{infoError}</span>
          </div>
        )}
        {infoMessage && (
          <div className="flex items-start gap-2 p-3 mb-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
            <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
            <span>{infoMessage}</span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">First Name</label>
            <div className="relative">
              <UserIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  setInfoErrors((p) => ({ ...p, firstName: null }));
                }}
                className={`${inputClass(infoErrors.firstName)} pl-9`}
              />
            </div>
            {infoErrors.firstName && <p className="mt-1 text-[10.5px] font-semibold text-red-600">{infoErrors.firstName}</p>}
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Last Name</label>
            <div className="relative">
              <UserIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  setInfoErrors((p) => ({ ...p, lastName: null }));
                }}
                className={`${inputClass(infoErrors.lastName)} pl-9`}
              />
            </div>
            {infoErrors.lastName && <p className="mt-1 text-[10.5px] font-semibold text-red-600">{infoErrors.lastName}</p>}
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Email Address</label>
          <div className="relative">
            <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value.replace(/\s/g, ""));
                setInfoErrors((p) => ({ ...p, email: null }));
              }}
              className={`${inputClass(infoErrors.email)} pl-9`}
            />
          </div>
          {infoErrors.email && <p className="mt-1 text-[10.5px] font-semibold text-red-600">{infoErrors.email}</p>}
        </div>
        <div className="mt-3">
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Phone Number</label>
          <div className="relative">
            <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              inputMode="numeric"
              maxLength={PH_MOBILE_LENGTH}
              value={phone}
              onChange={(e) => {
                setPhone(sanitizePhoneInput(e.target.value));
                setInfoErrors((p) => ({ ...p, phone: null }));
              }}
              className={`${inputClass(infoErrors.phone)} pl-9 font-mono`}
            />
          </div>
          {infoErrors.phone && <p className="mt-1 text-[10.5px] font-semibold text-red-600">{infoErrors.phone}</p>}
        </div>
        <div className="mt-4 flex justify-end">
          <DispatcherButton onClick={handleSaveInfo} loading={infoSaving} loadingText="Saving...">
            Save Changes
          </DispatcherButton>
        </div>
      </DispatcherCard>

      {/* CHANGE PASSWORD */}
      <DispatcherCard padding="lg">
        <DispatcherCard.Header eyebrow="SECURITY" icon={<Lock size={14} />} title="Change Password" />
        {passwordError && (
          <div className="flex items-start gap-2 p-3 mb-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>{passwordError}</span>
          </div>
        )}
        {passwordMessage && (
          <div className="flex items-start gap-2 p-3 mb-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
            <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
            <span>{passwordMessage}</span>
          </div>
        )}
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Current Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setPasswordErrors((p) => ({ ...p, currentPassword: null }));
                }}
                className={`${inputClass(passwordErrors.currentPassword)} pl-9 pr-9 font-mono`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {passwordErrors.currentPassword && (
              <p className="mt-1 text-[10.5px] font-semibold text-red-600">{passwordErrors.currentPassword}</p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">New Password</label>
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordErrors((p) => ({ ...p, newPassword: null }));
                }}
                className={`${inputClass(passwordErrors.newPassword)} font-mono`}
              />
              {passwordErrors.newPassword && (
                <p className="mt-1 text-[10.5px] font-semibold text-red-600">{passwordErrors.newPassword}</p>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Confirm New Password</label>
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordErrors((p) => ({ ...p, confirmPassword: null }));
                }}
                className={`${inputClass(passwordErrors.confirmPassword)} font-mono`}
              />
              {passwordErrors.confirmPassword && (
                <p className="mt-1 text-[10.5px] font-semibold text-red-600">{passwordErrors.confirmPassword}</p>
              )}
            </div>
          </div>
          {(newPassword || confirmPassword) && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">Password Requirements</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                {PASSWORD_RULES.map((rule) => {
                  const passed = rule.test(newPassword);
                  return (
                    <div
                      key={rule.label}
                      className={`flex items-center gap-1.5 text-[11px] font-semibold ${
                        passed ? "text-emerald-600" : "text-slate-400"
                      }`}
                    >
                      {passed ? <CircleCheck size={13} className="text-emerald-500" /> : <Circle size={13} className="text-slate-300" />}
                      <span>{rule.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-end">
          <DispatcherButton onClick={handleChangePassword} loading={passwordSaving} loadingText="Updating...">
            Update Password
          </DispatcherButton>
        </div>
      </DispatcherCard>
    </div>
  );
}
