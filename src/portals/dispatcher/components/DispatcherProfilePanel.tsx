import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  Loader2,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Check,
  Circle,
  Trash2,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { apiClient } from "../../../services/apiClient";
import { fetchStaffPhoto, uploadStaffPhoto, deleteStaffPhoto } from "../../../services/staffPhotoService";
import { DispatcherCard } from "@/components/panel/DispatcherCard";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { DispatcherBadge } from "@/components/panel/DispatcherBadge";
import { DispatcherInlineBanner } from "@/components/panel/DispatcherInlineBanner";
import { Field, fieldInputClasses } from "@/components/panel/Field";
import { PanelShell } from "@/components/panel/PanelShell";
import { useDraft, forgetDrafts } from "../lib/useDraft";
import { cn } from "@/lib/utils";
import { AccountSecurityLogsView } from "@/components/account/AccountSecurityLogsView";
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
  const [activeSubTab, setActiveSubTab] = useState<"profile" | "security">("profile");

  /**
   * Drafted, keyed by user id: the portal unmounts this panel on every tab
   * switch, so without this a dispatcher part way through the form lost it by
   * clicking Order Queue in the rail they use all shift.
   *
   * `seedX` fills from the server only when nothing is half-typed, and never
   * writes to the draft store, so an unsaved edit survives a refetch and a
   * refetch never becomes a draft. The password fields below are NOT drafted,
   * on purpose: see useDraft.ts.
   */
  const draftKey = `profile:${user?.id ?? "unknown"}`;
  const [firstName, setFirstName, , seedFirstName] = useDraft(`${draftKey}:firstName`);
  const [lastName, setLastName, , seedLastName] = useDraft(`${draftKey}:lastName`);
  const [email, setEmail, , seedEmail] = useDraft(`${draftKey}:email`);
  const [phone, setPhone, , seedPhone] = useDraft(`${draftKey}:phone`);
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
      seedFirstName(data.firstName || "");
      seedLastName(data.lastName || "");
      seedEmail(data.email || "");
      seedPhone(data.phone || "");
      setPhotoUri(data.photoUpdatedAt ? await fetchStaffPhoto(user.id) : null);
    } catch (err) {
      console.warn("Failed to load dispatcher profile:", err);
    } finally {
      setLoadingProfile(false);
    }
  }, [user?.id, seedFirstName, seedLastName, seedEmail, seedPhone]);

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
      // Saved edits stop being drafts, but stay on screen: `forgetDrafts`
      // rather than `clear`, which blanks the box and is only right for text
      // that has been sent. Without this the next fetch would be outranked by
      // a draft now identical to the server, permanently.
      forgetDrafts(draftKey);
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

  /**
   * Route board build. Six things were wrong here beyond the palette.
   *
   * There were two `<h1>` elements on screen: the board band renders one, and
   * this panel rendered a second under a tinted blue icon chip. This tab is
   * now on PanelShell like every other tab, so it gets an `<h2>` and the same
   * pinned-header-plus-one-scroller shape as its five neighbours.
   *
   * Seven visible labels were paired with seven inputs and not one pairing
   * existed in the markup: no `htmlFor`, no `id`. Clicking a label focused
   * nothing and a screen reader announced every field unnamed. They all go
   * through `Field` now, which generates the id and cannot be rendered
   * without wiring it.
   *
   * The password reveal was a bare 14px icon with no accessible name and no
   * box: a target a third the size of the minimum, controlling all three
   * password fields from inside the first one. It is a named 36px control on
   * its own row, where what it governs is legible.
   *
   * Error text rendered at `text-[10.5px]`. The smallest type in the console
   * was the type that tells you what went wrong.
   *
   * Five `—` placeholders in the account table said nothing about whether a
   * field was empty or had failed to load.
   *
   * And the three `eyebrow` props here were the last call sites of a prop the
   * craft floor bans outright, which is why it can now be deleted.
   */
  const passwordInput = (hasError: string | null | undefined) =>
    cn(fieldInputClasses, "font-mono", hasError && "border-status-act-ink");

  return (
    <PanelShell
      title="Your profile"
      detail={profile?.username ? `Signed in as ${profile.username}` : "Your account and sign-in"}
    >
      {/* Sub-tab segmented control */}
      <div className="mb-4 flex items-center gap-1.5 border-b border-hairline pb-2.5">
        <button
          type="button"
          onClick={() => setActiveSubTab("profile")}
          className={cn(
            "px-3.5 py-1.5 text-label font-medium rounded-plate transition-colors cursor-pointer",
            activeSubTab === "profile"
              ? "bg-board-field text-white"
              : "text-ink-muted hover:text-ink hover:bg-board-ground"
          )}
        >
          Profile Information
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("security")}
          className={cn(
            "px-3.5 py-1.5 text-label font-medium rounded-plate transition-colors cursor-pointer",
            activeSubTab === "security"
              ? "bg-board-field text-white"
              : "text-ink-muted hover:text-ink hover:bg-board-ground"
          )}
        >
          Account Logs &amp; Security
        </button>
      </div>

      {activeSubTab === "profile" ? (
        <div className="grid max-w-6xl grid-cols-1 items-start gap-3 pb-2 xl:grid-cols-2">
        {/* who you are */}
        <DispatcherCard padding="md">
          <div className="flex items-center gap-4">
            <div
              data-on-field
              className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-plate bg-board-field text-title text-board-plate"
            >
              {photoBusy ? (
                <Loader2 className="animate-spin" size={20} />
              ) : photoUri ? (
                <img src={photoUri} alt="Your profile photo" className="size-full object-cover" />
              ) : (
                <span data-figure>{initials}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-panel text-ink">{user?.name || "Dispatcher"}</p>
              <p className="truncate text-body text-ink-muted">{user?.email}</p>
              <div className="mt-2.5 flex items-center gap-2">
                <DispatcherButton
                  size="sm"
                  variant="secondary"
                  icon={<Camera size={14} />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photoBusy}
                >
                  Change the photo
                </DispatcherButton>
                {photoUri && (
                  <DispatcherButton
                    size="sm"
                    variant="danger-ghost"
                    icon={<Trash2 size={14} />}
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
              {photoError && (
                <p role="alert" className="mt-1.5 text-label text-status-act-ink">
                  {photoError}
                </p>
              )}
            </div>
          </div>
        </DispatcherCard>

        {/* the account record */}
        <DispatcherCard padding="md">
          <DispatcherCard.Header title="Account" />
          {loadingProfile ? (
            <div className="flex items-center justify-center gap-2 py-6 text-body text-ink-muted">
              <Loader2 className="animate-spin" size={18} />
              Loading your account
            </div>
          ) : (
            <dl className="m-0 divide-y divide-hairline">
              <div className="flex items-baseline justify-between gap-3 py-2">
                <dt className="text-body text-ink-muted">Username</dt>
                <dd data-figure className="m-0 truncate font-mono text-label text-ink">
                  {profile?.username || "Not recorded"}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-2">
                <dt className="text-body text-ink-muted">Role</dt>
                <dd className="m-0 truncate text-label capitalize text-ink">
                  {(profile?.role || "Not recorded").toLowerCase()}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2">
                <dt className="text-body text-ink-muted">Status</dt>
                <dd className="m-0">
                  {profile?.status ? (
                    <DispatcherBadge
                      variant={profile.status === "Active" ? "success" : "neutral"}
                    >
                      {profile.status}
                    </DispatcherBadge>
                  ) : (
                    <span className="text-label text-ink-muted">Not recorded</span>
                  )}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-2">
                <dt className="text-body text-ink-muted">On the roster since</dt>
                <dd data-figure className="m-0 text-label tabular-nums text-ink">
                  {profile?.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString()
                    : "Not recorded"}
                </dd>
              </div>
            </dl>
          )}
        </DispatcherCard>

        {/* your details */}
        <DispatcherCard padding="md">
          <DispatcherCard.Header title="Your details" />

          {infoError ? (
            <p
              role="alert"
              className="mb-3 rounded-plate bg-status-act-fill px-3 py-2 text-label text-status-act-ink"
            >
              {infoError}
            </p>
          ) : null}
          <DispatcherInlineBanner
            message={infoMessage ? { variant: "success", text: infoMessage } : null}
            onDismiss={() => setInfoMessage("")}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="First name" error={infoErrors.firstName}>
              {(control) => (
                <input
                  {...control}
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    setInfoErrors((p) => ({ ...p, firstName: null }));
                  }}
                  className={fieldInputClasses}
                />
              )}
            </Field>
            <Field label="Last name" error={infoErrors.lastName}>
              {(control) => (
                <input
                  {...control}
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    setInfoErrors((p) => ({ ...p, lastName: null }));
                  }}
                  className={fieldInputClasses}
                />
              )}
            </Field>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Email address" error={infoErrors.email}>
              {(control) => (
                <div className="relative">
                  <Mail
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                  />
                  <input
                    {...control}
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value.replace(/\s/g, ""));
                      setInfoErrors((p) => ({ ...p, email: null }));
                    }}
                    className={cn(fieldInputClasses, "pl-9")}
                  />
                </div>
              )}
            </Field>
            <Field
              label="Phone number"
              hint={`${PH_MOBILE_LENGTH} digits, starting 09`}
              error={infoErrors.phone}
            >
              {(control) => (
                <div className="relative">
                  <Phone
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                  />
                  <input
                    {...control}
                    type="text"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={PH_MOBILE_LENGTH}
                    value={phone}
                    onChange={(e) => {
                      setPhone(sanitizePhoneInput(e.target.value));
                      setInfoErrors((p) => ({ ...p, phone: null }));
                    }}
                    className={cn(fieldInputClasses, "pl-9 font-mono tabular-nums")}
                  />
                </div>
              )}
            </Field>
          </div>

          <div className="mt-4 flex justify-end">
            <DispatcherButton onClick={handleSaveInfo} loading={infoSaving} loadingText="Saving">
              Save these details
            </DispatcherButton>
          </div>
        </DispatcherCard>

        {/* your password */}
        <DispatcherCard padding="md">
          <DispatcherCard.Header icon={<Lock size={15} />} title="Your password" />

          {passwordError ? (
            <p
              role="alert"
              className="mb-3 rounded-plate bg-status-act-fill px-3 py-2 text-label text-status-act-ink"
            >
              {passwordError}
            </p>
          ) : null}
          <DispatcherInlineBanner
            message={passwordMessage ? { variant: "success", text: passwordMessage } : null}
            onDismiss={() => setPasswordMessage("")}
          />

          <div className="space-y-3">
            <Field label="Current password" error={passwordErrors.currentPassword}>
              {(control) => (
                <div className="relative">
                  <Lock
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                  />
                  <input
                    {...control}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      setPasswordErrors((p) => ({ ...p, currentPassword: null }));
                    }}
                    className={cn(passwordInput(passwordErrors.currentPassword), "pl-9")}
                  />
                </div>
              )}
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="New password" error={passwordErrors.newPassword}>
                {(control) => (
                  <input
                    {...control}
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setPasswordErrors((p) => ({ ...p, newPassword: null }));
                    }}
                    className={passwordInput(passwordErrors.newPassword)}
                  />
                )}
              </Field>
              <Field label="New password again" error={passwordErrors.confirmPassword}>
                {(control) => (
                  <input
                    {...control}
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setPasswordErrors((p) => ({ ...p, confirmPassword: null }));
                    }}
                    className={passwordInput(passwordErrors.confirmPassword)}
                  />
                )}
              </Field>
            </div>

            {/* Out of the first field and onto its own row. It governs all
                three password boxes, which was impossible to tell when it was
                a 14px eye tucked inside one of them, and it had no accessible
                name at all. */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-pressed={showPassword}
              className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-trim px-2 text-label text-ink-muted transition-colors hover:text-ink"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              {showPassword ? "Hide the passwords" : "Show the passwords"}
            </button>

            {(newPassword || confirmPassword) && (
              <DispatcherCard.Region padding="sm">
                <DispatcherCard.Label as="h4">What a password needs</DispatcherCard.Label>
                <ul className="m-0 grid list-none grid-cols-1 gap-x-4 gap-y-1.5 p-0 sm:grid-cols-2">
                  {PASSWORD_RULES.map((rule) => {
                    const passed = rule.test(newPassword);
                    return (
                      <li
                        key={rule.label}
                        className={cn(
                          "flex items-center gap-1.5 text-body",
                          passed ? "text-status-done-ink" : "text-ink-muted"
                        )}
                      >
                        {passed ? (
                          <Check size={14} className="shrink-0" />
                        ) : (
                          <Circle size={12} className="shrink-0" />
                        )}
                        <span>{rule.label}</span>
                        <span className="sr-only">{passed ? ", met" : ", not met yet"}</span>
                      </li>
                    );
                  })}
                </ul>
              </DispatcherCard.Region>
            )}
          </div>

          <div className="mt-4 flex justify-end">
            <DispatcherButton
              onClick={handleChangePassword}
              loading={passwordSaving}
              loadingText="Updating"
            >
              Update the password
            </DispatcherButton>
          </div>
        </DispatcherCard>
      </div>
      ) : (
        <div className="max-w-6xl pb-4">
          <AccountSecurityLogsView showHeader={false} />
        </div>
      )}
    </PanelShell>
  );
}
