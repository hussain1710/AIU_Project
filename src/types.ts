/** Shapes returned by the faculty API (from the response format AIU shared). */
export interface Education {
  degree: string;
  institution: string;
  year: number;
}

export interface Publication {
  title: string;
  year: number;
}

export interface Faculty {
  id: number;
  name: string;
  designation: string;
  school: string;
  department: string;
  email: string;
  office: string;
  photo_url: string | null;
  biography: string;
  education: Education[];
  research_interests: string[];
  publications: Publication[];
  courses_taught: string[];
}

export interface FacultyListResponse {
  count: number;
  data: Faculty[];
}
