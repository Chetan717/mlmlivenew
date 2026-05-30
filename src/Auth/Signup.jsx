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
    const randomPart = Array.from({ length: 4 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");
    return randomPart + mobile.slice(-4);
  };

  const generateOTP = () =>
    Math.floor(1000 + Math.random() * 9000).toString();

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
    if (!/^[0-9]{4}$/.test(data.pin))
      return "PIN must be exactly 4 digits";
    return null;
  };

  const onSignupSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {};
    formData.forEach((value, key) => { data[key] = value.toString().trim(); });

    const validationError = validateData(data);
    if (validationError) { setFormError(validationError); return; }

    try {
      setLoading(true);
      setFormError("");
      setReferMsg("");

      const q = query(collection(db, "users"), where("mobileNo", "==", data.mobile));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) { setFormError("Mobile number already registered"); return; }

      let referredByDocId = null;
      const trimmedRefer = referInput.trim().toUpperCase();
      if (trimmedRefer !== "") {
        if (!/^[A-Z]{4}[0-9]{4}$/.test(trimmedRefer)) { setFormError("Invalid refer code format"); return; }
        const referSnap = await getDocs(query(collection(db, "users"), where("referCode", "==", trimmedRefer)));
        if (referSnap.empty) { setFormError("Refer code not found"); return; }
        referredByDocId = referSnap.docs[0].id;
      }

      const referCode = generateReferCode(data.mobile);
      const otp = await sendOtp(data.mobile);
      const docRef = await addDoc(collection(db, "users"), {
        name: data.name,
        mobileNo: data.mobile,
        password: data.pin,
        createdAt: new Date(),
        isverified: false,
        otp: otp,
        referCode: referCode,
        referredBy: trimmedRefer || null,
        referCredit: 0,
      });

      setSentOtp(otp);
      setUserId(docRef.id);
      setUserMobile(data.mobile);
      if (referredByDocId) sessionStorage.setItem("referredByDocId", referredByDocId);
      setStep(2);
    } catch (error) {
      console.error("Signup Error:", error);
      setFormError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async () => {
    if (enteredOtp.length < 4) { setOtpError("Please enter the 4-digit OTP"); return; }
    if (enteredOtp !== sentOtp) { setOtpError("Incorrect OTP. Please try again."); setEnteredOtp(""); return; }

    try {
      setLoading(true);
      setOtpError("");
      await updateDoc(doc(db, "users", userId), { isverified: true, otp: "", referCredit: referInput.trim() !== "" ? 5 : 0 });

      const referredByDocId = sessionStorage.getItem("referredByDocId");
      if (referredByDocId) {
        const referrerSnap = await getDocs(query(collection(db, "users"), where("__name__", "==", referredByDocId)));
        if (!referrerSnap.empty) {
          const currentCredits = referrerSnap.docs[0].data().referCredit || 0;
          await updateDoc(doc(db, "users", referredByDocId), { referCredit: currentCredits + 10 });
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
    } catch { setOtpError("Failed to resend OTP."); }
    finally { setLoading(false); }
  };

  const stepTitles = ["", "Create Account", "Verify OTP"];
  const stepSubs = ["", "Join MLM LIVE today", `OTP sent to +91 ${userMobile}`];

  return (
    <div className="flex flex-col min-h-screen bg-background overflow-hidden">

      {/* Hero gradient header */}
      <div className="relative h-[240px] md:h-[280px] bg-accent overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-accent via-[#1a3a8f] to-[#0a1744]" />
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-white/5" />

        <div className="relative z-10 flex flex-col items-center justify-center h-full gap-3 px-6">
          <div className="w-16 h-16 bg-white rounded-[18px] shadow-2xl flex items-center justify-center border-2 border-white/20 p-2">
            <img src={logo} alt="MLM LIVE" className="w-full h-full object-contain" />
          </div>
          <div className="text-center">
            <h1 className="text-white font-display font-bold text-2xl leading-tight">
              {stepTitles[step]}
            </h1>
            <p className="text-white/70 text-sm mt-1 font-medium">
              {stepSubs[step]}
            </p>
          </div>

          {/* Step dots */}
          <div className="flex items-center gap-2 mt-1">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`rounded-full transition-all duration-300 ${
                  step === s ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-8 bg-background rounded-t-[32px]" />
      </div>

      {/* Form area */}
      <div className="flex-1 flex flex-col items-center px-6 pt-2 pb-8 bg-background -mt-1">
        <div className="w-full max-w-sm">

          {/* ── STEP 1 : Signup Form ── */}
          {step === 1 && (
            <Form className="flex w-full flex-col gap-5" onSubmit={onSignupSubmit}>
              <TextField name="name" type="text" className="w-full">
                <Label className="font-semibold text-sm text-foreground/80 mb-1.5 block">Full Name</Label>
                <Input
                  className="w-full"
                  classNames={{
                    inputWrapper: "h-13 bg-white dark:bg-black/20 border border-border hover:border-accent focus-within:!border-accent focus-within:!ring-accent shadow-sm rounded-xl",
                    input: "text-base font-medium"
                  }}
                  placeholder="Enter your full name"
                />
                <FieldError className="text-danger mt-1 text-xs" />
              </TextField>

              <TextField name="mobile" type="tel" className="w-full">
                <Label className="font-semibold text-sm text-foreground/80 mb-1.5 block">Mobile Number</Label>
                <Input
                  className="w-full"
                  classNames={{
                    inputWrapper: "h-13 bg-white dark:bg-black/20 border border-border hover:border-accent focus-within:!border-accent focus-within:!ring-accent shadow-sm rounded-xl",
                    input: "text-base font-medium tracking-wide"
                  }}
                  placeholder="10-digit number"
                  maxLength={10}
                />
                <FieldError className="text-danger mt-1 text-xs" />
              </TextField>

              <div className="flex flex-col gap-1 w-full">
                <Label className="font-semibold text-sm text-foreground/80 mb-1.5 block">Create 4-Digit PIN</Label>
                <InputOTP name="pin" maxLength={4}>
                  <InputOTP.Group className="gap-3 w-full justify-between">
                    {[0, 1, 2, 3].map((i) => (
                      <InputOTP.Slot
                        key={i}
                        index={i}
                        className="flex-1 h-14 text-2xl font-bold bg-white dark:bg-black/20 border border-border data-[focus=true]:border-accent data-[focus=true]:ring-accent shadow-sm rounded-xl"
                      />
                    ))}
                  </InputOTP.Group>
                </InputOTP>
              </div>

              <div className="flex flex-col gap-1 w-full">
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="font-semibold text-sm text-foreground/80">Refer Code</Label>
                  <span className="text-muted-foreground font-medium text-[10px] bg-muted px-2 py-0.5 rounded-full uppercase tracking-wide">
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
                  className="h-13 px-4 border border-border bg-white dark:bg-black/20 rounded-xl w-full text-base tracking-widest font-mono uppercase outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all shadow-sm"
                />
                {referMsg && <p className="text-success text-xs mt-1 font-medium">{referMsg}</p>}
              </div>

              {formError && (
                <div className="bg-danger/10 border border-danger/20 text-danger text-sm text-center py-3 px-4 rounded-xl font-medium">
                  {formError}
                </div>
              )}

              <Button
                className="w-full h-13 bg-accent hover:bg-accent/90 text-white font-bold text-base shadow-lg shadow-accent/25 rounded-xl mt-2"
                type="submit"
                isLoading={loading}
              >
                {loading ? "Sending OTP..." : "Continue"}
              </Button>

              <p className="text-center text-sm font-medium text-muted-foreground">
                Already have an account?
                <span
                  onClick={() => navigate("/login")}
                  className="ml-1.5 text-accent font-bold cursor-pointer hover:underline"
                >
                  Login
                </span>
              </p>
            </Form>
          )}

          {/* ── STEP 2 : OTP Verification ── */}
          {step === 2 && (
            <div className="flex w-full flex-col gap-6 pt-2">
              <div className="flex flex-col gap-1 w-full">
                <Label className="font-semibold text-sm text-foreground/80 mb-1.5 block text-center">
                  Enter 4-Digit OTP
                </Label>
                <InputOTP maxLength={4} value={enteredOtp} onChange={(val) => setEnteredOtp(val)}>
                  <InputOTP.Group className="gap-3 w-full justify-between">
                    {[0, 1, 2, 3].map((i) => (
                      <InputOTP.Slot
                        key={i}
                        index={i}
                        className="flex-1 h-14 text-2xl font-bold bg-white dark:bg-black/20 border border-border data-[focus=true]:border-accent data-[focus=true]:ring-accent shadow-sm rounded-xl"
                      />
                    ))}
                  </InputOTP.Group>
                </InputOTP>
              </div>

              {otpError && (
                <div className="bg-danger/10 border border-danger/20 text-danger text-sm text-center py-3 px-4 rounded-xl font-medium">
                  {otpError}
                </div>
              )}

              <Button
                className="w-full h-13 bg-accent hover:bg-accent/90 text-white font-bold text-base shadow-lg shadow-accent/25 rounded-xl"
                onClick={onVerifyOtp}
                isLoading={loading}
              >
                {loading ? "Verifying..." : "Verify & Create Account"}
              </Button>

              <div className="flex justify-between items-center px-2">
                <span
                  onClick={() => setStep(1)}
                  className="text-sm text-muted-foreground font-semibold cursor-pointer hover:text-foreground transition-colors"
                >
                  Back
                </span>
                <span
                  onClick={onResendOtp}
                  className="text-sm text-accent font-bold cursor-pointer hover:underline"
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
