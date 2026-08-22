import type { AppRole, ClassComponent, Weekday } from "@/types/database";
import { supabase } from "./supabase";

export interface SessionProfile {
  id: string;
  role: AppRole;
  fullName: string;
  institutionalEmail: string;
}

export interface AcademicBlock {
  assignmentId: string;
  teacherId: string;
  teacherProfileId: string | null;
  teacherName: string;
  teacherEmail: string | null;
  courseId: string;
  courseCode: string | null;
  courseName: string;
  sectionId: string;
  sectionCode: string;
  originalSection: string;
  component: ClassComponent;
  classNumber: number;
  day: Weekday;
  startTime: string;
  endTime: string;
  classroom: string | null;
  modality: string | null;
  coordinators: CoordinatorContact[];
}

export interface CoordinatorContact {
  fullName: string;
  phone: string | null;
  institutionalEmail: string | null;
}

interface QuerySchedule {
  day_of_week: Weekday;
  start_time: string;
  end_time: string;
  classroom: string | null;
  modality: string | null;
}

interface QueryComponent {
  original_section_code: string;
  component: ClassComponent;
  class_number: number;
  schedules: QuerySchedule[];
}

interface QueryAssignment {
  id: string;
  teacher: { id: string; profile_id: string | null; display_name: string; institutional_email: string | null };
  section: {
    id: string;
    section_code: string;
    course: { id: string; code: string | null; name: string };
    components: QueryComponent[];
  };
}

export async function getSessionProfile(userId: string): Promise<SessionProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, institutional_email")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return { id: data.id, role: data.role as AppRole, fullName: data.full_name, institutionalEmail: data.institutional_email };
}

export async function getAcademicBlocks(): Promise<AcademicBlock[]> {
  const { data, error } = await supabase
    .from("teacher_assignments")
    .select(`
      id,
      teacher:teachers!inner(id, profile_id, display_name, institutional_email),
      section:sections!inner(
        id,
        section_code,
        course:courses!inner(id, code, name),
        components:section_components(
          original_section_code,
          component,
          class_number,
          schedules(day_of_week, start_time, end_time, classroom, modality)
        )
      )
    `)
    .eq("academic_term", "2026-II")
    .eq("active", true);
  if (error) throw error;

  const { data: coordinatorData, error: coordinatorError } = await supabase
    .from("course_coordinator_assignments")
    .select("course_id, coordinator:course_coordinators!inner(full_name, phone, institutional_email)")
    .eq("active", true)
    .not("course_id", "is", null);
  if (coordinatorError) throw coordinatorError;
  const coordinatorMap = new Map<string, CoordinatorContact[]>();
  for (const item of coordinatorData as unknown as Array<{ course_id: string; coordinator: { full_name: string; phone: string | null; institutional_email: string | null } }>) {
    const contacts = coordinatorMap.get(item.course_id) ?? [];
    contacts.push({ fullName: item.coordinator.full_name, phone: item.coordinator.phone, institutionalEmail: item.coordinator.institutional_email });
    coordinatorMap.set(item.course_id, contacts);
  }

  return (data as unknown as QueryAssignment[]).flatMap((assignment) =>
    assignment.section.components.flatMap((component) =>
      component.schedules.map((schedule) => ({
        assignmentId: assignment.id,
        teacherId: assignment.teacher.id,
        teacherProfileId: assignment.teacher.profile_id,
        teacherName: assignment.teacher.display_name,
        teacherEmail: assignment.teacher.institutional_email,
        courseId: assignment.section.course.id,
        courseCode: assignment.section.course.code,
        courseName: assignment.section.course.name,
        sectionId: assignment.section.id,
        sectionCode: assignment.section.section_code,
        originalSection: component.original_section_code,
        component: component.component,
        classNumber: component.class_number,
        day: schedule.day_of_week,
        startTime: schedule.start_time,
        endTime: schedule.end_time,
        classroom: schedule.classroom,
        modality: schedule.modality,
        coordinators: coordinatorMap.get(assignment.section.course.id) ?? [],
      })),
    ),
  );
}
