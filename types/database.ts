/** Domain types for the future Supabase integration. No frontend is connected yet. */
export type UUID = string;
export type ISODateTime = string;
export type LocalTime = string;
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AppRole = "docente" | "coordinacion";
export type Weekday = "lunes" | "martes" | "miércoles" | "jueves" | "viernes" | "sábado" | "domingo";
export type ClassComponent = "teoría" | "práctica";
export type ActivityStatus = "draft" | "published" | "closed" | "cancelled";
export type TargetType = "all" | "teacher" | "course" | "section";
export type ActivityResponseStatus = "pending" | "completed" | "overdue" | "exempt" | "rejected";
export type EvidenceType = "file" | "external_link";
export type AnnouncementPriority = "normal" | "important" | "urgent";
export type DocumentCategory = "syllabus" | "forms" | "rectifications" | "manuals" | "academic" | "other";
export type TutorialCategory = "canvas" | "peoplesoft" | "teams" | "grades" | "attendance" | "other";

export interface Profile {
  id: UUID;
  role: AppRole;
  full_name: string;
  institutional_email: string;
  employee_code: string | null;
  active: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface Teacher {
  id: UUID;
  profile_id: UUID | null;
  display_name: string;
  institutional_email: string | null;
  source_identifier: string | null;
  phone: string | null;
  active: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface Course {
  id: UUID;
  code: string | null;
  name: string;
  short_name: string | null;
  area: string;
  active: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface Section {
  id: UUID;
  course_id: UUID;
  section_code: string;
  academic_program: string | null;
  modality: string | null;
  campus: string;
  academic_term: string;
  active: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface TeacherAssignment {
  id: UUID;
  teacher_id: UUID;
  section_id: UUID;
  teacher_category: string | null;
  academic_term: string;
  active: boolean;
  created_at: ISODateTime;
}

export interface SectionComponent {
  id: UUID;
  section_id: UUID;
  original_section_code: string;
  component: ClassComponent;
  class_number: number;
  associated_class: number | null;
  class_type: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface Schedule {
  id: UUID;
  teacher_assignment_id: UUID;
  section_component_id: UUID;
  day_of_week: Weekday;
  start_time: LocalTime;
  end_time: LocalTime;
  classroom: string | null;
  modality: string | null;
  shift: string | null;
  teaching_model: string | null;
  academic_hours: number | null;
  facility_id: string | null;
  environment_type: string | null;
  environment_capacity: number | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface CourseCoordinator {
  id: UUID;
  full_name: string;
  phone: string | null;
  institutional_email: string | null;
  active: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface CourseCoordinatorAssignment {
  id: UUID;
  coordinator_id: UUID;
  course_id: UUID | null;
  source_course_name: string;
  active: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface Activity {
  id: UUID;
  title: string;
  description: string;
  activity_type: string | null;
  published_at: ISODateTime | null;
  due_at: ISODateTime | null;
  status: ActivityStatus;
  requires_evidence: boolean;
  created_by: UUID | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface TargetRecord {
  id: UUID;
  target_type: TargetType;
  teacher_id: UUID | null;
  course_id: UUID | null;
  section_id: UUID | null;
  created_at: ISODateTime;
}

export interface ActivityTarget extends TargetRecord {
  activity_id: UUID;
}

export interface ActivityResponse {
  id: UUID;
  activity_id: UUID;
  teacher_id: UUID;
  status: ActivityResponseStatus;
  completed_at: ISODateTime | null;
  teacher_comment: string | null;
  coordinator_comment: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface Evidence {
  id: UUID;
  activity_response_id: UUID;
  file_name: string | null;
  file_path: string | null;
  external_url: string | null;
  evidence_type: EvidenceType;
  uploaded_at: ISODateTime;
  created_at: ISODateTime;
}

export interface Announcement {
  id: UUID;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  published_at: ISODateTime;
  expires_at: ISODateTime | null;
  created_by: UUID | null;
  active: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface AnnouncementTarget extends TargetRecord {
  announcement_id: UUID;
}

export interface AnnouncementRead {
  id: UUID;
  announcement_id: UUID;
  teacher_id: UUID;
  read_at: ISODateTime;
}

export interface DocumentRecord {
  id: UUID;
  title: string;
  description: string | null;
  category: DocumentCategory;
  course_id: UUID | null;
  external_url: string | null;
  storage_path: string | null;
  document_code: string | null;
  academic_term: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_at: ISODateTime | null;
  active: boolean;
  created_by: UUID | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface Tutorial {
  id: UUID;
  title: string;
  description: string | null;
  category: TutorialCategory;
  video_url: string;
  thumbnail_url: string | null;
  active: boolean;
  created_by: UUID | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface NotificationRecord {
  id: UUID;
  profile_id: UUID;
  title: string;
  body: string;
  notification_type: string;
  read_at: ISODateTime | null;
  created_at: ISODateTime;
}

export interface AuditLogEntry {
  id: number;
  actor_profile_id: UUID | null;
  action: string;
  entity_type: string;
  entity_id: UUID | null;
  metadata: Json;
  created_at: ISODateTime;
}

export type NewActivity = Pick<Activity, "title" | "description" | "activity_type" | "published_at" | "due_at" | "status" | "requires_evidence">;
export type TeacherActivityResponseUpdate = Pick<ActivityResponse, "status" | "completed_at" | "teacher_comment">;
export type NewEvidence = Pick<Evidence, "activity_response_id" | "file_name" | "file_path" | "external_url" | "evidence_type">;
export type NewAnnouncement = Pick<Announcement, "title" | "body" | "priority" | "published_at" | "expires_at" | "active">;
