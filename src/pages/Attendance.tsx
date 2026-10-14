import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, LogIn } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { markAttendance } from "@/services/attendance";

const Attendance = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  const [result, setResult] = useState<{ success: boolean; message: string; status: string } | null>(null);

  const verifyMutation = useMutation({
    mutationFn: () => {
      if (!code.trim()) throw new Error("Please enter your attendance code.");
      // Normalization (trim/uppercase/drop separators) also happens server-side.
      return markAttendance(code);
    },
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (error: unknown) => {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "An error occurred.",
        status: "error"
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    verifyMutation.mutate();
  };

  return (
    <Layout>
      <Helmet>
        <title>Mark Attendance — Unstop Igniters Club</title>
      </Helmet>

      <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[70vh]">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Mark Your Attendance</CardTitle>
            <CardDescription>
              Enter the attendance code provided by the event organizer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                {result.success ? (
                  <>
                    <CheckCircle2 className="h-16 w-16 text-green-500 mb-2" />
                    <h3 className="text-xl font-semibold text-green-600">Attendance Marked ✅</h3>
                  </>
                ) : (
                  <>
                    <XCircle className="h-16 w-16 text-red-500 mb-2" />
                    <h3 className="text-xl font-semibold text-red-600">Verification Failed</h3>
                  </>
                )}
                <p className="text-muted-foreground">{result.message}</p>

                {result.status === "unauthorized" ? (
                  <Button
                    className="mt-4 bg-gradient-to-r from-primary to-secondary"
                    onClick={() => navigate("/auth")}
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign in to mark attendance
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setResult(null);
                      setCode("");
                    }}
                  >
                    Try again
                  </Button>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Attendance Code</Label>
                  <Input
                    id="code"
                    placeholder="e.g. UIC-7K9X-4M2P"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    maxLength={20}
                    autoComplete="off"
                    autoCapitalize="characters"
                    className="h-14 text-center font-mono text-xl tracking-[0.2em]"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    The event is detected automatically from your code — no need to select it.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-secondary mt-2 h-12 text-base"
                  disabled={verifyMutation.isPending}
                >
                  {verifyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {verifyMutation.isPending ? "Marking Attendance..." : "Mark Attendance"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Attendance;
