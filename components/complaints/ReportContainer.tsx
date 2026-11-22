'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CameraCapture } from './CameraCapture';
import { LocationPicker } from './LocationPicker';
import { CategorySelector } from './CategorySelector';
import { DescriptionInput } from './DescriptionInput';
import { SuccessScreen } from './SuccessScreen';
import { MyComplaintsList } from './MyComplaintsList';
import { ComplaintCategory } from '@/lib/types/database';
import { SubmitComplaintResponse } from '@/app/api/complaints/route';
import {
  AlertCircle,
  Send,
  Loader2,
  FileText,
  MapPin,
  Map as MapIcon,
} from 'lucide-react';

interface ReportContainerProps {
  userRole: string;
}

export function ReportContainer({ userRole }: ReportContainerProps) {
  const [activeTab, setActiveTab] = useState<'report' | 'my-complaints'>('report');

  // Complaint Form States
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [addressText, setAddressText] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<ComplaintCategory | null>(null);
  const [description, setDescription] = useState<string>('');

  // Submission States
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<{
    id: string;
    wardName: string | null;
    imageUrl?: string;
    category?: ComplaintCategory;
  } | null>(null);

  const handleLocationChange = (newLat: number, newLng: number, newAddress: string) => {
    setLat(newLat);
    setLng(newLng);
    setAddressText(newAddress);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Validation checks
    if (!imageFile) {
      setSubmitError('Please capture or select an evidence photo.');
      return;
    }

    if (imageFile.size > 10 * 1024 * 1024) {
      setSubmitError('Image too large (max 10MB). Selected file exceeds limit.');
      return;
    }

    if (lat === null || lng === null) {
      setSubmitError('Location is required. Please allow GPS or adjust your position on the map.');
      return;
    }

    if (!selectedCategory) {
      setSubmitError('Please select a category for the civic issue.');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('lat', lat.toString());
      formData.append('lng', lng.toString());
      formData.append('category', selectedCategory);
      formData.append('description', description);
      formData.append('address_text', addressText);

      const res = await fetch('/api/complaints', {
        method: 'POST',
        body: formData,
      });

      const data: SubmitComplaintResponse = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit complaint. Please try again.');
      }

      setSubmittedData({
        id: data.id || 'NIGAM-TICKET',
        wardName: data.ward_name || null,
        imageUrl: data.image_url,
        category: selectedCategory,
      });
    } catch (err: unknown) {
      const error = err as Error;
      setSubmitError(error.message || 'Network error occurred while submitting.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setImageFile(null);
    setSelectedCategory(null);
    setDescription('');
    setSubmittedData(null);
    setSubmitError(null);
  };

  return (
    <div className="space-y-4">
      {/* 3-Tab Mobile Navigation */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-surface-card border border-border rounded-xl text-center text-xs font-semibold shadow-sm">
        <button
          type="button"
          onClick={() => {
            setSubmittedData(null);
            setActiveTab('report');
          }}
          className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'report'
              ? 'bg-accent text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Report</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSubmittedData(null);
            setActiveTab('my-complaints');
          }}
          className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'my-complaints'
              ? 'bg-accent text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>My Complaints</span>
        </button>

        <Link
          href="/"
          className="py-2 px-3 rounded-lg text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 transition-colors"
        >
          <MapIcon className="w-3.5 h-3.5" />
          <span>Map</span>
        </Link>
      </div>

      {/* View 1: Success Screen after Submission */}
      {submittedData ? (
        <SuccessScreen
          complaintId={submittedData.id}
          wardName={submittedData.wardName}
          imageUrl={submittedData.imageUrl}
          category={submittedData.category}
          onReset={handleResetForm}
          onViewMyComplaints={() => {
            setSubmittedData(null);
            setActiveTab('my-complaints');
          }}
        />
      ) : activeTab === 'my-complaints' ? (
        /* View 2: "My Complaints" Tab */
        <MyComplaintsList onSwitchToReport={() => setActiveTab('report')} />
      ) : (
        /* View 3: Active Report Form Flow */
        <form onSubmit={handleFormSubmit} className="space-y-5">
          {/* Camera Intake Component */}
          <CameraCapture
            onCapture={(file) => setImageFile(file)}
            disabled={submitting}
          />

          {/* Location Picker with Live GPS & Map Override */}
          <LocationPicker
            lat={lat}
            lng={lng}
            addressText={addressText}
            onLocationChange={handleLocationChange}
            disabled={submitting}
          />

          {/* Category Selector (6 cards) */}
          <CategorySelector
            selectedCategory={selectedCategory}
            onSelect={(cat) => setSelectedCategory(cat)}
            disabled={submitting}
          />

          {/* Description & Voice Slot */}
          <DescriptionInput
            value={description}
            onChange={(val) => setDescription(val)}
            disabled={submitting}
          />

          {/* Submission Error Banner */}
          {submitError && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-status-open/10 border border-status-open/30 text-status-open text-xs flex items-start gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Submission Blocked</span>
                <span className="text-[11px] font-medium">{submitError}</span>
              </div>
            </div>
          )}

          {/* Sticky Mobile Submit Button */}
          <div className="pt-2 sticky bottom-4 z-10">
            <button
              type="submit"
              disabled={submitting || !imageFile || !selectedCategory || lat === null}
              className={`w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
                submitting || !imageFile || !selectedCategory || lat === null
                  ? 'bg-muted/70 text-muted-foreground cursor-not-allowed opacity-60'
                  : 'bg-accent hover:bg-blue-700 active:scale-[0.99]'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Compressing & Registering Complaint...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Complaint</span>
                </>
              )}
            </button>

            <p className="text-center text-[10px] text-muted-foreground mt-2">
              Citizen Claim: <span className="font-mono font-semibold uppercase">{userRole}</span> &bull; Verified evidence routing
            </p>
          </div>
        </form>
      )}
    </div>
  );
}
