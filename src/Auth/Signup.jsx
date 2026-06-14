"use client";
import { useState } from "react";
import {
  Button,
  FieldError,
  Form,
  Input,
  Label,
  TextField,
} from "@heroui/react";
import { InputOTP } from "@heroui/react";
import { useNavigate } from "react-router";
import logo from "/mlmboo2.ico";
import axios from "axios";

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@firebase-config";

export function Signup() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [sentOtp, setSentOtp] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [userId, setUserId] = useState("");
  const [userMobile, setUserMobile] = useState("");
  const [referInput, setReferInput] = useState("");
  const [referMsg, setReferMsg] = useState("");

  const generateReferCode = (mobile) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const randomPart = Array.from(
      { length: 4 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join("");
    return randomPart + mobile.slice(-4);
  };

  const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

  const sendOtp = async (phoneNumber) => {
    const otp = generateOTP();
    await axios({
      method: "get",
      maxBodyLength: Infinity,
      url: `https://2factor.in/API/V1/${import.meta.env.VITE_TWOFACTOR_API_KEY}/SMS/${"91" + phoneNumber}/${otp}/MLMBOOSTER`,
      headers: {},
    });
    return otp;
  };

  const validateData = (data) => {
    if (!data.name || data.name.trim().length < 3)
      return "Name must be at least 3 characters";
    if (!/^[0-9]{10}$/.test(data.mobile))
      return "Mobile number must be exactly 10 digits";
    if (!/^[0-9]{4}$/.test(data.pin)) return "PIN must be exactly 4 digits";
    return null;
  };

  const onSignupSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {};
    formData.forEach((value, key) => {
      data[key] = value.toString().trim();
    });

    const validationError = validateData(data);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      setLoading(true);
      setFormError("");
      setReferMsg("");

      const q = query(
        collection(db, "users"),
        where("mobileNo", "==", data.mobile),
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setFormError("Mobile number already registered");
        return;
      }

      let referredByDocId = null;
      const trimmedRefer = referInput.trim().toUpperCase();
      if (trimmedRefer !== "") {
        if (!/^[A-Z]{4}[0-9]{4}$/.test(trimmedRefer)) {
          setFormError("Invalid refer code format");
          return;
        }
        const referSnap = await getDocs(
          query(
            collection(db, "users"),
            where("referCode", "==", trimmedRefer),
          ),
        );
        if (referSnap.empty) {
          setFormError("Refer code not found");
          return;
        }
        referredByDocId = referSnap.docs[0].id;
      }

      const referCode = generateReferCode(data.mobile);
      // const otp = await sendOtp(data.mobile);
      const otp = "1111";
      const docRef = await addDoc(collection(db, "users"), {
        name: data.name,
        mobileNo: data.mobile,
        password: data.pin,
        createdAt: new Date(),
        isverified: true,
        otp: otp,
        referCode: referCode,
        referredBy: trimmedRefer || null,
        referCredit: 0,
      });

      setSentOtp(otp);
      setUserId(docRef.id);
      setUserMobile(data.mobile);

      if (referredByDocId)
        sessionStorage.setItem("referredByDocId", referredByDocId);
      setStep(1);
      navigate("/login");
    } catch (error) {
      console.error("Signup Error:", error);
      setFormError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async () => {
    // if (enteredOtp.length < 4) { setOtpError("Please enter the 4-digit OTP"); return; }
    // if (enteredOtp !== sentOtp) { setOtpError("Incorrect OTP. Please try again."); setEnteredOtp(""); return; }

    try {
      setLoading(true);
      setOtpError("");
      await updateDoc(doc(db, "users", userId), {
        isverified: true,
        otp: "",
        referCredit: referInput.trim() !== "" ? 5 : 0,
      });

      const referredByDocId = sessionStorage.getItem("referredByDocId");
      if (referredByDocId) {
        const referrerSnap = await getDocs(
          query(
            collection(db, "users"),
            where("__name__", "==", referredByDocId),
          ),
        );
        if (!referrerSnap.empty) {
          const currentCredits = referrerSnap.docs[0].data().referCredit || 0;
          await updateDoc(doc(db, "users", referredByDocId), {
            referCredit: currentCredits + 10,
          });
        }
        sessionStorage.removeItem("referredByDocId");
      }
      navigate("/login");
    } catch (error) {
      console.error("Verify Error:", error);
      setOtpError("Verification failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const onResendOtp = async () => {
    try {
      setLoading(true);
      setOtpError("");
      const otp = await sendOtp(userMobile);
      setSentOtp(otp);
      await updateDoc(doc(db, "users", userId), { otp: otp });
      alert("OTP resent successfully!");
    } catch {
      setOtpError("Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  // const stepTitles = ["", "Create Account", "Verify OTP"];
  const stepTitles = ["", "Create Account", "Confirm & Create"];
  const stepSubs = [
    "",
    "Join MLM LIVE today",
    "Join MLM LIVE today",
    // `OTP sent to +91 ${userMobile}`
  ];

  return (
    <div
      className="flex flex-col min-h-screen relative overflow-hidden"
      style={{ background: "linear-gradient(170deg, #040c22 0%, #0e245c 38%, #f4f6fb 38%)" }}
    >
      {/* ── Background decorative shapes ── */}
      <div className="absolute top-0 left-0 right-0 h-[46vh] overflow-hidden pointer-events-none">
        <div
          className="absolute -top-16 -right-16 w-52 h-52 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #4f6cc4, transparent)" }}
        />
        <div
          className="absolute top-24 -left-14 w-40 h-40 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #4f6cc4, transparent)" }}
        />
        <div className="absolute top-5 right-10 w-10 h-10 rounded-xl border border-white/10 rotate-12" />
        <div className="absolute top-16 right-24 w-4 h-4 rounded-full bg-white/10" />
        <div className="absolute top-8 left-14 w-3 h-3 rounded-full bg-white/15" />
      </div>

      {/* ── Hero area ── */}
      <div className="relative z-10 flex flex-col items-center pt-12 pb-8 px-6">
        <div
          className="w-[68px] h-[68px] bg-white rounded-[20px] flex items-center justify-center p-2 mb-4"
          style={{ boxShadow: "0 12px 40px rgba(14,36,92,0.5), 0 4px 12px rgba(0,0,0,0.25)" }}
        >
          <img src={logo} alt="MLM LIVE" className="w-full h-full object-contain" />
        </div>

        <h1 className="text-white font-display font-bold text-[24px] leading-tight text-center">
          {step === 1 ? "नया अकाउंट बनाएं!" : "Confirm & Create"}
        </h1>
        <p className="text-white/60 text-[13px] font-medium mt-1 text-center">
          {step === 1 ? "Join MLM LIVE — आज ही शुरू करें" : "Verify & complete your account"}
        </p>

        {/* Step indicator */}
        <div className="flex items-center gap-2.5 mt-3">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`rounded-full transition-all duration-300 ${
                step === s ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/30"
              }`}
            />
          ))}
        </div>
      </div>

      {/* ── Form card ── */}
      <div
        className="relative z-10 flex-1 bg-[var(--background)] rounded-t-[32px] px-5 pt-6 pb-10"
        style={{ boxShadow: "0 -4px 32px rgba(0,0,0,0.12)" }}
      >
        <div className="w-full max-w-sm mx-auto">

          {/* ── STEP 1 : Signup Form ── */}
          {step === 1 && (
            <Form className="flex w-full flex-col gap-4" onSubmit={onSignupSubmit}>

              <TextField name="name" type="text" className="w-full">
                <Label className="font-semibold text-[13px] text-foreground/70 mb-1.5 block">
                  Full Name / पूरा नाम
                </Label>
                <Input
                  className="w-full"
                  classNames={{
                    inputWrapper:
                      "h-[52px] bg-[var(--field-background)] border border-[var(--border)] hover:border-accent focus-within:!border-accent focus-within:!ring-2 focus-within:!ring-accent/20 shadow-sm rounded-2xl",
                    input: "text-[15px] font-medium",
                  }}
                  placeholder="Enter your full name"
                />
                <FieldError className="text-danger mt-1 text-xs" />
              </TextField>

              <TextField name="mobile" type="tel" className="w-full">
                <Label className="font-semibold text-[13px] text-foreground/70 mb-1.5 block">
                  Mobile Number / मोबाइल नंबर
                </Label>
                <Input
                  className="w-full"
                  classNames={{
                    inputWrapper:
                      "h-[52px] bg-[var(--field-background)] border border-[var(--border)] hover:border-accent focus-within:!border-accent focus-within:!ring-2 focus-within:!ring-accent/20 shadow-sm rounded-2xl",
                    input: "text-[15px] font-medium tracking-wide",
                  }}
                  placeholder="10-digit number"
                  maxLength={10}
                />
                <FieldError className="text-danger mt-1 text-xs" />
              </TextField>

              <div className="flex flex-col gap-1 w-full">
                <Label className="font-semibold text-[13px] text-foreground/70 mb-1.5 block">
                  Create 4-Digit PIN / 4 अंकों का PIN बनाएं
                </Label>
                <InputOTP name="pin" maxLength={4}>
                  <InputOTP.Group className="gap-3 w-full justify-between">
                    {[0, 1, 2, 3].map((i) => (
                      <InputOTP.Slot
                        key={i}
                        index={i}
                        className="flex-1 h-[56px] text-2xl font-bold bg-[var(--field-background)] border border-[var(--border)] data-[focus=true]:border-accent data-[focus=true]:ring-2 data-[focus=true]:ring-accent/20 shadow-sm rounded-2xl"
                      />
                    ))}
                  </InputOTP.Group>
                </InputOTP>
              </div>

              <div className="flex flex-col gap-1 w-full">
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="font-semibold text-[13px] text-foreground/70">
                    Refer Code
                  </Label>
                  <span className="text-muted-foreground font-semibold text-[10px] bg-[var(--border)] px-2 py-0.5 rounded-full uppercase tracking-wide">
                    Optional
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. ABCD1234"
                  maxLength={8}
                  value={referInput}
                  onChange={(e) => {
                    setReferInput(e.target.value.toUpperCase());
                    setReferMsg("");
                    setFormError("");
                  }}
                  className="h-[52px] px-4 border border-[var(--border)] bg-[var(--field-background)] rounded-2xl w-full text-[15px] tracking-widest font-mono uppercase outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all shadow-sm"
                />
                {referMsg && (
                  <p className="text-success text-xs mt-1 font-medium">{referMsg}</p>
                )}
              </div>

              {formError && (
                <div className="bg-danger/8 border border-danger/20 text-danger text-[13px] text-center py-3 px-4 rounded-2xl font-medium">
                  {formError}
                </div>
              )}

              <Button
                className="w-full h-[54px] text-white font-bold text-[15px] rounded-2xl mt-1"
                style={{
                  background: "linear-gradient(135deg, #0e245c 0%, #1a3a8f 60%, #2a4faa 100%)",
                  boxShadow: "0 8px 24px rgba(14,36,92,0.35), 0 2px 6px rgba(0,0,0,0.12)",
                }}
                type="submit"
                isLoading={loading}
              >
                {loading ? "Creating..." : "अकाउंट बनाएं — Continue"}
              </Button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-0.5">
                <div className="flex-1 h-px bg-[var(--border)]" />
                <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="w-full h-[52px] rounded-2xl border border-[var(--border)] text-accent font-bold text-[14px]"
                style={{ background: "var(--field-background)", touchAction: "manipulation" }}
              >
                पहले से है? Login करें — Sign In
              </button>

            </Form>
          )}

          {/* ── STEP 2 : OTP Verification ── */}
          {step === 2 && (
            <div className="flex w-full flex-col gap-6 pt-2">
              <div className="flex flex-col gap-1 w-full">
                <Label className="font-semibold text-[13px] text-foreground/70 mb-2 block text-center">
                  Enter 4-Digit OTP
                </Label>
                <InputOTP
                  maxLength={4}
                  value={enteredOtp}
                  onChange={(val) => setEnteredOtp(val)}
                >
                  <InputOTP.Group className="gap-3 w-full justify-between">
                    {[0, 1, 2, 3].map((i) => (
                      <InputOTP.Slot
                        key={i}
                        index={i}
                        className="flex-1 h-[56px] text-2xl font-bold bg-[var(--field-background)] border border-[var(--border)] data-[focus=true]:border-accent data-[focus=true]:ring-2 data-[focus=true]:ring-accent/20 shadow-sm rounded-2xl"
                      />
                    ))}
                  </InputOTP.Group>
                </InputOTP>
              </div>

              {otpError && (
                <div className="bg-danger/8 border border-danger/20 text-danger text-[13px] text-center py-3 px-4 rounded-2xl font-medium">
                  {otpError}
                </div>
              )}

              <Button
                className="w-full h-[54px] text-white font-bold text-[15px] rounded-2xl"
                style={{
                  background: "linear-gradient(135deg, #0e245c 0%, #1a3a8f 60%, #2a4faa 100%)",
                  boxShadow: "0 8px 24px rgba(14,36,92,0.35), 0 2px 6px rgba(0,0,0,0.12)",
                }}
                onClick={onVerifyOtp}
                isLoading={loading}
              >
                {loading ? "Verifying..." : "Verify & Create Account"}
              </Button>

              <div className="flex justify-between items-center px-2">
                <span
                  onClick={() => setStep(1)}
                  className="text-[13px] text-muted-foreground font-semibold cursor-pointer"
                  style={{ touchAction: "manipulation" }}
                >
                  ← Back
                </span>
                <span
                  onClick={onResendOtp}
                  className="text-[13px] text-accent font-bold cursor-pointer"
                  style={{ touchAction: "manipulation" }}
                >
                  Resend OTP
                </span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
