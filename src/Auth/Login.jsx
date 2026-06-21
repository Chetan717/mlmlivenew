"use client";
import { useState, useRef } from "react";
import {
  Button,
  FieldError,
  Form,
  Input,
  Label,
  TextField,
} from "@heroui/react";
import logo from "/mlmboo2.ico";
import { InputOTP } from "@heroui/react";
import { useNavigate } from "react-router";
import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore";
import { db } from "@firebase-config";
import { toast } from "@heroui/react";
import axios from "axios";
import { COLLECTIONS } from "../collections";

export function Login() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [pin, setPin] = useState("");
  const [lockout, setLockout] = useState(0);
  const failCountRef = useRef(0);

  const sendOtp = async (phoneNumber) => {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    await axios({
      method: "get",
      maxBodyLength: Infinity,
      url: `https://2factor.in/API/V1/${import.meta.env.VITE_TWOFACTOR_API_KEY}/SMS/${"+91" + phoneNumber}/${otp}/OTP`,
      headers: {},
    });
    return otp;
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (lockout > Date.now()) {
      const secs = Math.ceil((lockout - Date.now()) / 1000);
      setFormError(`Too many failed attempts. Try again in ${secs}s.`);
      return;
    }
    const formData = new FormData(e.currentTarget);
    const data = {};
    formData.forEach((value, key) => {
      data[key] = value.toString().trim();
    });

    if (!/^[0-9]{10}$/.test(data.mobile)) {
      setFormError("Please enter a valid 10-digit mobile number");
      return;
    }
    if (!/^[0-9]{4}$/.test(pin)) {
      setFormError("Please enter a valid 4-digit PIN");
      return;
    }

    try {
      setLoading(true);
      setFormError("");

      const q = query(
        collection(db, COLLECTIONS.USERS),
        where("mobileNo", "==", data.mobile)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setFormError("No account found with this mobile number");
        return;
      }

      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();

      if (!userData.isverified) {
        const otp = await sendOtp(data.mobile);
        await updateDoc(doc(db, COLLECTIONS.USERS, userDoc.id), { otp });
        toast.success("OTP भेजा गया! Verify करें।");
        navigate("/signup", {
          state: {
            verifyMode: true,
            userId: userDoc.id,
            mobile: userData.mobileNo,
            otp,
          },
        });
        return;
      }

      if (userData.password !== pin) {
        failCountRef.current += 1;
        if (failCountRef.current >= 5) {
          const until = Date.now() + 30_000;
          setLockout(until);
          failCountRef.current = 0;
          setFormError("Too many failed attempts. Please wait 30 seconds.");
        } else {
          setFormError(`Incorrect PIN. Please try again. (${failCountRef.current}/5)`);
        }
        return;
      }
      failCountRef.current = 0;
      setLockout(0);

      const userToStore = {
        id: userDoc.id,
        name: userData.name,
        mobileNo: userData.mobileNo,
        isverified: userData.isverified,
        createdAt: userData.createdAt?.toDate?.()?.toISOString() ?? "",
        referCode: userData.referCode ?? "",
        referredBy: userData.referredBy ?? null,
        referCredit: userData.referCredit ?? 0,
        referredByMteam: userData.referredByMteam ?? null,
        mteamCouponCode: userData.mteamCouponCode ?? null,
      };

      localStorage.setItem("usermlm", JSON.stringify(userToStore));

      const profileQuery = query(
        collection(db, COLLECTIONS.MLMPROFILES),
        where("mobile", "==", data.mobile)
      );
      const profileSnapshot = await getDocs(profileQuery);

      if (!profileSnapshot.empty) {
        const profileDoc = profileSnapshot.docs[0];
        localStorage.setItem(
          "mlmProfile",
          JSON.stringify({ id: profileDoc.id, ...profileDoc.data() })
        );
        toast.success("Login Successful!");
        navigate("/");
      } else {
        toast.success("Login Successful!");
        navigate("/selectcomp");
      }
    } catch (error) {
      console.error("Login Error:", error);
      setFormError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex flex-col min-h-screen relative overflow-hidden"
      style={{ background: "linear-gradient(170deg, #040c22 0%, #0088DA 40%, #f4f6fb 40%)" }}
    >
      <div className="absolute top-0 left-0 right-0 h-[50vh] overflow-hidden pointer-events-none">
        <div
          className="absolute -top-20 -right-20 w-56 h-56 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #0088DA, transparent)" }}
        />
        <div
          className="absolute top-28 -left-16 w-44 h-44 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #0088DA, transparent)" }}
        />
        <div className="absolute top-6 right-8 w-12 h-12 rounded-2xl border border-white/10 rotate-12" />
        <div className="absolute top-20 right-20 w-5 h-5 rounded-full bg-white/10" />
        <div className="absolute top-10 left-12 w-3 h-3 rounded-full bg-white/15" />
      </div>

      <div className="relative z-10 flex flex-col items-center pt-14 pb-10 px-6">
        <div
          className="w-[72px] h-[72px] bg-white rounded-[22px] flex items-center justify-center p-2 mb-5"
          style={{ boxShadow: "0 12px 40px rgba(14,36,92,0.5), 0 4px 12px rgba(0,0,0,0.25)" }}
        >
          <img src={logo} alt="MLM LIVE" className="w-full h-full object-contain" />
        </div>

        <h1 className="text-white font-display font-bold text-[26px] leading-tight text-center">
          वापस स्वागत है!
        </h1>
        <p className="text-white/60 text-[13px] font-medium mt-1 text-center">
          Welcome back — Sign in to MLM LIVE
        </p>
      </div>

      <div className="relative z-10 flex-1 bg-[var(--background)] rounded-t-[32px] px-5 pt-6 pb-10"
        style={{ boxShadow: "0 -4px 32px rgba(0,0,0,0.12)" }}>
        <div className="w-full max-w-sm mx-auto">
          <Form className="flex w-full flex-col gap-5" onSubmit={onSubmit}>

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
                placeholder="Enter your 10-digit number"
                maxLength={10}
              />
              <FieldError className="text-danger mt-1 text-xs" />
            </TextField>

            <div className="flex flex-col gap-1 w-full">
              <div className="flex justify-between items-center mb-2">
                <Label className="font-semibold text-[13px] text-foreground/70">
                  4-Digit PIN / 4 अंकों का PIN
                </Label>
                <span
                  onClick={() => navigate("/forgetpin")}
                  className="text-[12px] text-accent font-bold cursor-pointer"
                  style={{ touchAction: "manipulation" }}
                >
                  Forgot PIN?
                </span>
              </div>
              <InputOTP
                name="pin"
                maxLength={4}
                value={pin}
                onChange={(val) => setPin(val)}
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

            {formError && (
              <div className="bg-danger/8 border border-danger/20 text-danger text-[13px] text-center py-3 px-4 rounded-2xl font-medium">
                {formError}
              </div>
            )}

            <Button
              className="w-full h-[54px] text-white font-bold text-[15px] rounded-2xl mt-1"
              style={{
                background: "linear-gradient(135deg, #0088DA 0%, #1a3a8f 60%, #2a4faa 100%)",
                boxShadow: "0 8px 24px rgba(14,36,92,0.35), 0 2px 6px rgba(0,0,0,0.12)",
              }}
              type="submit"
              isLoading={loading}
            >
              {loading ? "Logging in..." : "Login करें — Sign In"}
            </Button>

            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-[var(--border)]" />
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>

            <button
              type="button"
              onClick={() => navigate("/signup")}
              className="w-full h-[52px] rounded-2xl border border-[var(--border)] text-accent font-bold text-[14px]"
              style={{
                background: "var(--field-background)",
                touchAction: "manipulation",
              }}
            >
              नया अकाउंट बनाएं — Register
            </button>

          </Form>
        </div>
      </div>
    </div>
  );
}
