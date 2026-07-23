import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getPublishedEvents } from "@/services/events";
import { verifyAttendanceCode } from "@/services/attendance";

const Attendance = () => {
  const [searchParams] = useSearchParams();
  const preselectedEventId = searchParams.get("event") || "";

  const [eventId, setEventId] = useState(preselectedEventId);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["published-events"],
    queryFn: getPublishedEvents,
  });

  // If the event ID was preselected from URL but events are loaded, ensure it's valid.
  useEffect(() => {
    if (events && preselectedEventId) {
      const exists = events.some(e => e.id === preselectedEventId);
      if (exists) {
        setEventId(preselectedEventId);
      }
    }
  }, [events, preselectedEventId]);

  const verifyMutation = useMutation({
    mutationFn: () => {
      if (!eventId) throw new Error("Please select an event.");
      if (!code.trim()) throw new Error("Please enter your attendance code.");
      if (!name.trim()) throw new Error("Please enter your name.");
      if (!email.trim()) throw new Error("Please enter your email.");
      return verifyAttendanceCode(eventId, code.trim(), name.trim(), email.trim());
    },
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (error: unknown) => {
      setResult({ success: false, message: error instanceof Error ? error.message : "An error occurred." });
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
              Enter the 6-character code provided at the event to confirm your attendance.
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
                
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    setResult(null);
                    setCode("");
                  }}
                >
                  Mark another code
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="event">Event</Label>
                  {eventsLoading ? (
                    <div className="h-10 border rounded flex items-center px-3 bg-muted/50 text-sm text-muted-foreground">
                      Loading events...
                    </div>
                  ) : (
                    <Select value={eventId} onValueChange={setEventId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an event" />
                      </SelectTrigger>
                      <SelectContent>
                        {events?.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">Attendance Code</Label>
                  <Input 
                    id="code" 
                    placeholder="e.g. A8K9X2" 
                    value={code} 
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    placeholder="John Doe" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email"
                    placeholder="john@example.com" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-primary to-secondary mt-2"
                  disabled={verifyMutation.isPending || !eventId}
                >
                  {verifyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {verifyMutation.isPending ? "Verifying..." : "Mark Attendance"}
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
