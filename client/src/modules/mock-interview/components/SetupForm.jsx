import { useState } from 'react';
import { Briefcase, MessageSquare, Mic2, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ROLES = [
  { value: 'software-engineer', label: 'Software Engineer' },
  { value: 'data-analyst', label: 'Data Analyst' },
  { value: 'product-manager', label: 'Product Manager' },
  { value: 'ux-designer', label: 'UX Designer' },
  { value: 'marketing-specialist', label: 'Marketing Specialist' },
  { value: 'sales-representative', label: 'Sales Representative' },
  { value: 'customer-support', label: 'Customer Support' },
  { value: 'business-analyst', label: 'Business Analyst' },
];

const TYPES = [
  { value: 'hr', label: 'HR Interview' },
  { value: 'behavioral', label: 'Behavioral Interview' },
  { value: 'technical', label: 'Technical Interview' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'ms', label: 'Bahasa Melayu' },
];

const PERSONAS = [
  { value: 'neutral', label: 'Standard Interviewer' },
  { value: 'friendly', label: 'Friendly HR' },
  { value: 'strict', label: 'Strict Technical Lead' },
];

export function SetupForm({ onStart, loading }) {
  const [role, setRole] = useState('');
  const [type, setType] = useState('');
  const [language, setLanguage] = useState('en');
  const [persona, setPersona] = useState('neutral');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!role || !type) return;
    onStart({ role, type, language, persona });
  };

  return (
    <Card className="mx-auto w-full max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic2 className="h-5 w-5" />
          AI Mock Interview
        </CardTitle>
        <CardDescription>
          Select your target role and interview type to generate tailored questions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="role">
              <Briefcase className="mb-0.5 mr-1 inline h-4 w-4" />
              Target Role
            </Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="role" className="w-full">
                <SelectValue placeholder="Choose a role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">
              <MessageSquare className="mb-0.5 mr-1 inline h-4 w-4" />
              Interview Type
            </Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="type" className="w-full">
                <SelectValue placeholder="Choose interview type" />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Interview Language / Bahasa</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="language" className="w-full">
                <SelectValue placeholder="Choose language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="persona">Interviewer Persona</Label>
            <Select value={persona} onValueChange={setPersona}>
              <SelectTrigger id="persona" className="w-full">
                <SelectValue placeholder="Choose persona" />
              </SelectTrigger>
              <SelectContent>
                {PERSONAS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={!role || !type || loading}>
            {loading ? 'Starting…' : 'Start Interview'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
