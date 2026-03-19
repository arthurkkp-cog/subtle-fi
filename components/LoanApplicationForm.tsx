"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import {
  createNewLoanApplication,
  updateExistingLoanApplication,
  submitToLendingPartner,
} from "@/lib/actions/loan.actions";

import LoanCalculatorBar from "@/components/LoanCalculatorBar";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const loanTypes: { value: LoanType; label: string; icon: string; description: string }[] = [
  {
    value: "mortgage",
    label: "Mortgage",
    icon: "🏠",
    description: "Home purchase or refinance",
  },
  {
    value: "auto",
    label: "Auto Loan",
    icon: "🚗",
    description: "New or used vehicle purchase",
  },
  {
    value: "personal",
    label: "Personal Loan",
    icon: "👤",
    description: "Debt consolidation, home improvement, etc.",
  },
  {
    value: "education",
    label: "Education",
    icon: "🎓",
    description: "Tuition, books, and education expenses",
  },
];

const termOptions: Record<string, { value: number; label: string }[]> = {
  mortgage: [
    { value: 180, label: "15 years" },
    { value: 240, label: "20 years" },
    { value: 360, label: "30 years" },
  ],
  auto: [
    { value: 36, label: "36 months" },
    { value: 48, label: "48 months" },
    { value: 60, label: "60 months" },
    { value: 72, label: "72 months" },
  ],
  personal: [
    { value: 12, label: "12 months" },
    { value: 24, label: "24 months" },
    { value: 36, label: "36 months" },
    { value: 48, label: "48 months" },
    { value: 60, label: "60 months" },
  ],
  education: [
    { value: 60, label: "5 years" },
    { value: 120, label: "10 years" },
    { value: 180, label: "15 years" },
    { value: 240, label: "20 years" },
  ],
};

const aprByType: Record<string, number> = {
  mortgage: 6.875,
  auto: 7.25,
  personal: 11.5,
  education: 5.5,
};

const amountRanges: Record<string, { min: number; max: number; step: number }> = {
  mortgage: { min: 50000, max: 1000000, step: 5000 },
  auto: { min: 5000, max: 100000, step: 1000 },
  personal: { min: 1000, max: 50000, step: 500 },
  education: { min: 1000, max: 200000, step: 1000 },
};

const formSchema = z.object({
  loanType: z.enum(["mortgage", "auto", "personal", "education"]),
  requestedAmount: z.coerce.number().min(1000, "Minimum amount is $1,000"),
  termMonths: z.coerce.number().min(1, "Please select a term"),
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Invalid email address"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  dateOfBirth: z.string().optional(),
  annualIncome: z.coerce.number().optional(),
  employmentStatus: z.string().optional(),
  // Conditional fields
  propertyAddress: z.string().optional(),
  propertyType: z.string().optional(),
  downPaymentPercent: z.coerce.number().optional(),
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleYear: z.coerce.number().optional(),
  schoolName: z.string().optional(),
  degreeType: z.string().optional(),
  expectedGraduation: z.string().optional(),
  loanPurpose: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const LoanApplicationForm = ({
  user,
  draftApplication,
}: LoanApplicationFormProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDraftSaving, setIsDraftSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      loanType: (draftApplication?.loanType as LoanType) || "personal",
      requestedAmount: draftApplication?.requestedAmount || 25000,
      termMonths: draftApplication?.termMonths || 36,
      firstName: draftApplication?.firstName || user.firstName || "",
      lastName: draftApplication?.lastName || user.lastName || "",
      email: draftApplication?.email || user.email || "",
      address: draftApplication?.address || user.address1 || "",
      city: draftApplication?.city || user.city || "",
      state: draftApplication?.state || user.state || "",
      postalCode: draftApplication?.postalCode || user.postalCode || "",
      dateOfBirth: draftApplication?.dateOfBirth || user.dateOfBirth || "",
      annualIncome: draftApplication?.annualIncome || undefined,
      employmentStatus: draftApplication?.employmentStatus || "",
      propertyAddress: "",
      propertyType: "",
      downPaymentPercent: undefined,
      vehicleMake: "",
      vehicleModel: "",
      vehicleYear: undefined,
      schoolName: "",
      degreeType: "",
      expectedGraduation: "",
      loanPurpose: "",
    },
  });

  const watchedLoanType = form.watch("loanType");
  const watchedAmount = form.watch("requestedAmount");
  const watchedTerm = form.watch("termMonths");

  const currentAPR = aprByType[watchedLoanType] || 10;
  const currentRange = amountRanges[watchedLoanType] || amountRanges.personal;
  const currentTerms = termOptions[watchedLoanType] || termOptions.personal;

  const calculatePayment = useCallback(
    (principal: number, apr: number, months: number): number => {
      if (principal <= 0 || months <= 0) return 0;
      if (apr <= 0) return principal / months;
      const r = apr / 100 / 12;
      const n = months;
      const factor = Math.pow(1 + r, n);
      return (principal * (r * factor)) / (factor - 1);
    },
    []
  );

  const buildConditionalFields = useCallback(
    (data: FormValues): string => {
      const fields: Record<string, unknown> = {};
      if (data.loanType === "mortgage") {
        fields.propertyAddress = data.propertyAddress;
        fields.propertyType = data.propertyType;
        fields.downPaymentPercent = data.downPaymentPercent;
      } else if (data.loanType === "auto") {
        fields.vehicleMake = data.vehicleMake;
        fields.vehicleModel = data.vehicleModel;
        fields.vehicleYear = data.vehicleYear;
      } else if (data.loanType === "education") {
        fields.schoolName = data.schoolName;
        fields.degreeType = data.degreeType;
        fields.expectedGraduation = data.expectedGraduation;
      } else if (data.loanType === "personal") {
        fields.loanPurpose = data.loanPurpose;
      }
      return JSON.stringify(fields);
    },
    []
  );

  const saveDraft = async () => {
    setIsDraftSaving(true);
    try {
      const data = form.getValues();
      const monthlyPayment = calculatePayment(
        data.requestedAmount,
        currentAPR,
        data.termMonths
      );

      const params = {
        userId: user.$id || (user as Record<string, string>).id,
        loanType: data.loanType as LoanType,
        requestedAmount: data.requestedAmount,
        termMonths: data.termMonths,
        status: "draft" as LoanApplicationStatus,
        estimatedAPR: currentAPR,
        estimatedMonthlyPayment: monthlyPayment,
        conditionalFields: buildConditionalFields(data),
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        address: data.address,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        dateOfBirth: data.dateOfBirth,
        annualIncome: data.annualIncome,
        employmentStatus: data.employmentStatus,
      };

      if (draftApplication?.id) {
        await updateExistingLoanApplication({
          id: draftApplication.id,
          ...params,
        });
      } else {
        await createNewLoanApplication(params);
      }

      router.push("/my-loans");
    } catch (error) {
      console.error("Error saving draft:", error);
    }
    setIsDraftSaving(false);
  };

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      const monthlyPayment = calculatePayment(
        data.requestedAmount,
        currentAPR,
        data.termMonths
      );

      const params = {
        userId: user.$id || (user as Record<string, string>).id,
        loanType: data.loanType as LoanType,
        requestedAmount: data.requestedAmount,
        termMonths: data.termMonths,
        status: "submitted" as LoanApplicationStatus,
        estimatedAPR: currentAPR,
        estimatedMonthlyPayment: monthlyPayment,
        conditionalFields: buildConditionalFields(data),
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        address: data.address,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        dateOfBirth: data.dateOfBirth,
        annualIncome: data.annualIncome,
        employmentStatus: data.employmentStatus,
      };

      let application;
      if (draftApplication?.id) {
        application = await updateExistingLoanApplication({
          id: draftApplication.id,
          ...params,
        });
      } else {
        application = await createNewLoanApplication(params);
      }

      if (application?.id) {
        await submitToLendingPartner(application.id);
      }

      router.push("/my-loans");
    } catch (error) {
      console.error("Error submitting application:", error);
    }
    setIsLoading(false);
  };

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-6 pb-40"
        >
          {/* Loan Type Selection */}
          <div className="flex flex-col gap-2">
            <h3 className="text-16 font-semibold text-gray-900">
              Select Loan Type
            </h3>
            <FormField
              control={form.control}
              name="loanType"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {loanTypes.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => {
                            field.onChange(type.value);
                            const defaultTerm =
                              termOptions[type.value]?.[0]?.value || 36;
                            form.setValue("termMonths", defaultTerm);
                            const range = amountRanges[type.value];
                            const currentAmount = form.getValues("requestedAmount");
                            if (currentAmount < range.min || currentAmount > range.max) {
                              form.setValue(
                                "requestedAmount",
                                Math.round((range.min + range.max) / 2 / range.step) * range.step
                              );
                            }
                          }}
                          className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                            field.value === type.value
                              ? "border-blue-600 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <span className="text-30">{type.icon}</span>
                          <span className="text-14 font-semibold text-gray-900">
                            {type.label}
                          </span>
                          <span className="text-10 text-gray-500 text-center">
                            {type.description}
                          </span>
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Amount and Term */}
          <div className="flex flex-col gap-4 rounded-xl border border-gray-200 p-4 sm:p-6">
            <h3 className="text-16 font-semibold text-gray-900">
              Loan Details
            </h3>
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
              <FormField
                control={form.control}
                name="requestedAmount"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="text-14 font-medium text-gray-700">
                      Loan Amount
                    </FormLabel>
                    <FormControl>
                      <div className="flex flex-col gap-2">
                        <Input
                          type="number"
                          min={currentRange.min}
                          max={currentRange.max}
                          step={currentRange.step}
                          className="input-class"
                          {...field}
                        />
                        <input
                          type="range"
                          min={currentRange.min}
                          max={currentRange.max}
                          step={currentRange.step}
                          value={field.value}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                          className="w-full accent-blue-600"
                        />
                        <div className="flex justify-between text-10 text-gray-400">
                          <span>
                            $
                            {currentRange.min.toLocaleString()}
                          </span>
                          <span>
                            $
                            {currentRange.max.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="termMonths"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="text-14 font-medium text-gray-700">
                      Loan Term
                    </FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(Number(val))}
                      value={String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger className="input-class">
                          <SelectValue placeholder="Select term" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currentTerms.map((term) => (
                          <SelectItem
                            key={term.value}
                            value={String(term.value)}
                          >
                            {term.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Personal Information (pre-filled from KYC) */}
          <div className="flex flex-col gap-4 rounded-xl border border-gray-200 p-4 sm:p-6">
            <h3 className="text-16 font-semibold text-gray-900">
              Personal Information
            </h3>
            <p className="text-12 text-gray-500">
              Pre-filled from your profile. Please verify and update if needed.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-14 font-medium text-gray-700">
                      First Name
                    </FormLabel>
                    <FormControl>
                      <Input className="input-class" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-14 font-medium text-gray-700">
                      Last Name
                    </FormLabel>
                    <FormControl>
                      <Input className="input-class" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-14 font-medium text-gray-700">
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        className="input-class"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-14 font-medium text-gray-700">
                      Date of Birth
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="input-class"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-14 font-medium text-gray-700">
                      Address
                    </FormLabel>
                    <FormControl>
                      <Input className="input-class" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-3 gap-2">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-14 font-medium text-gray-700">
                        City
                      </FormLabel>
                      <FormControl>
                        <Input className="input-class" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-14 font-medium text-gray-700">
                        State
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="input-class"
                          maxLength={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-14 font-medium text-gray-700">
                        Zip
                      </FormLabel>
                      <FormControl>
                        <Input className="input-class" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Financial Info */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="annualIncome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-14 font-medium text-gray-700">
                      Annual Income
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        className="input-class"
                        placeholder="e.g. 75000"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="employmentStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-14 font-medium text-gray-700">
                      Employment Status
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="input-class">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="employed">Employed</SelectItem>
                        <SelectItem value="self-employed">
                          Self-Employed
                        </SelectItem>
                        <SelectItem value="retired">Retired</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="unemployed">Unemployed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Conditional Fields */}
          {watchedLoanType === "mortgage" && (
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 p-4 sm:p-6">
              <h3 className="text-16 font-semibold text-gray-900">
                Property Details
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="propertyAddress"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel className="text-14 font-medium text-gray-700">
                        Property Address
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="input-class"
                          placeholder="123 Main St, City, State ZIP"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="propertyType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-14 font-medium text-gray-700">
                        Property Type
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="input-class">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="single-family">
                            Single Family
                          </SelectItem>
                          <SelectItem value="condo">Condo</SelectItem>
                          <SelectItem value="townhouse">Townhouse</SelectItem>
                          <SelectItem value="multi-family">
                            Multi-Family
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="downPaymentPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-14 font-medium text-gray-700">
                        Down Payment (%)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          className="input-class"
                          placeholder="e.g. 20"
                          min={0}
                          max={100}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {watchedLoanType === "auto" && (
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 p-4 sm:p-6">
              <h3 className="text-16 font-semibold text-gray-900">
                Vehicle Details
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="vehicleMake"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-14 font-medium text-gray-700">
                        Make
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="input-class"
                          placeholder="e.g. Toyota"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vehicleModel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-14 font-medium text-gray-700">
                        Model
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="input-class"
                          placeholder="e.g. Camry"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vehicleYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-14 font-medium text-gray-700">
                        Year
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          className="input-class"
                          placeholder="e.g. 2024"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {watchedLoanType === "education" && (
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 p-4 sm:p-6">
              <h3 className="text-16 font-semibold text-gray-900">
                Education Details
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="schoolName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-14 font-medium text-gray-700">
                        School Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="input-class"
                          placeholder="e.g. Stanford University"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="degreeType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-14 font-medium text-gray-700">
                        Degree Type
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="input-class">
                            <SelectValue placeholder="Select degree" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="bachelors">
                            {`Bachelor's`}
                          </SelectItem>
                          <SelectItem value="masters">
                            {`Master's`}
                          </SelectItem>
                          <SelectItem value="doctorate">Doctorate</SelectItem>
                          <SelectItem value="professional">
                            Professional
                          </SelectItem>
                          <SelectItem value="certificate">
                            Certificate
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expectedGraduation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-14 font-medium text-gray-700">
                        Expected Graduation
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="input-class"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {watchedLoanType === "personal" && (
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 p-4 sm:p-6">
              <h3 className="text-16 font-semibold text-gray-900">
                Loan Purpose
              </h3>
              <FormField
                control={form.control}
                name="loanPurpose"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-14 font-medium text-gray-700">
                      What will this loan be used for?
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="input-class">
                          <SelectValue placeholder="Select purpose" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="debt-consolidation">
                          Debt Consolidation
                        </SelectItem>
                        <SelectItem value="home-improvement">
                          Home Improvement
                        </SelectItem>
                        <SelectItem value="major-purchase">
                          Major Purchase
                        </SelectItem>
                        <SelectItem value="medical">
                          Medical Expenses
                        </SelectItem>
                        <SelectItem value="moving">
                          Moving / Relocation
                        </SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={saveDraft}
              disabled={isDraftSaving || isLoading}
              className="flex-1 border-gray-300 text-gray-700"
            >
              {isDraftSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save as Draft"
              )}
            </Button>
            <Button
              type="submit"
              disabled={isLoading || isDraftSaving}
              className="flex-1 bg-bank-gradient font-semibold text-white shadow-form"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                "Submit Application"
              )}
            </Button>
          </div>
        </form>
      </Form>

      {/* Sticky Calculator Bar */}
      <LoanCalculatorBar
        loanType={watchedLoanType as LoanType}
        amount={watchedAmount}
        termMonths={watchedTerm}
        estimatedAPR={currentAPR}
      />
    </>
  );
};

export default LoanApplicationForm;
