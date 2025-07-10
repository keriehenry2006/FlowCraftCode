-- =====================================================
-- Process Flow Manager Database Schema
-- =====================================================

-- Note: auth.users table is managed by Supabase Auth and already has RLS enabled

-- =====================================================
-- 1. PROJECTS TABLE
-- =====================================================
CREATE TABLE public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT projects_name_user_unique UNIQUE (name, user_id)
);

-- Enable RLS for projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can view their own projects" ON public.projects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects" ON public.projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON public.projects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" ON public.projects
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 2. SHEETS TABLE
-- =====================================================
CREATE TABLE public.sheets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    custom_fields JSONB DEFAULT '{}', -- Stores custom field definitions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT sheets_name_project_unique UNIQUE (name, project_id)
);

-- Enable RLS for sheets
ALTER TABLE public.sheets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sheets
CREATE POLICY "Users can view sheets in their projects" ON public.sheets
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert sheets in their projects" ON public.sheets
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update sheets in their projects" ON public.sheets
    FOR UPDATE USING (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete sheets in their projects" ON public.sheets
    FOR DELETE USING (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- 3. PROCESSES TABLE (Updated)
-- =====================================================
-- Drop dependent views first, then table, then recreate
DROP VIEW IF EXISTS process_full CASCADE;
DROP VIEW IF EXISTS processes_with_dep_info CASCADE; 
DROP TABLE IF EXISTS public.processes CASCADE;

CREATE TABLE public.processes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Required fields for diagram functionality
    short_name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    working_day INTEGER DEFAULT 0,
    due_time VARCHAR(10), -- HH:MM:SS format
    dependencies TEXT DEFAULT '',
    process_type VARCHAR(50) DEFAULT 'standard',
    
    -- System fields
    sheet_id UUID REFERENCES public.sheets(id) ON DELETE CASCADE,
    custom_data JSONB DEFAULT '{}', -- Stores custom field values
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT processes_short_name_sheet_unique UNIQUE (short_name, sheet_id)
);

-- Enable RLS for processes
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for processes
CREATE POLICY "Users can view processes in their sheets" ON public.processes
    FOR SELECT USING (
        sheet_id IN (
            SELECT s.id FROM public.sheets s
            JOIN public.projects p ON s.project_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert processes in their sheets" ON public.processes
    FOR INSERT WITH CHECK (
        sheet_id IN (
            SELECT s.id FROM public.sheets s
            JOIN public.projects p ON s.project_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update processes in their sheets" ON public.processes
    FOR UPDATE USING (
        sheet_id IN (
            SELECT s.id FROM public.sheets s
            JOIN public.projects p ON s.project_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete processes in their sheets" ON public.processes
    FOR DELETE USING (
        sheet_id IN (
            SELECT s.id FROM public.sheets s
            JOIN public.projects p ON s.project_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

-- =====================================================
-- 4. INDEXES for Performance
-- =====================================================
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_projects_created_at ON public.projects(created_at);

CREATE INDEX idx_sheets_project_id ON public.sheets(project_id);
CREATE INDEX idx_sheets_created_at ON public.sheets(created_at);

CREATE INDEX idx_processes_sheet_id ON public.processes(sheet_id);
CREATE INDEX idx_processes_short_name ON public.processes(short_name);
CREATE INDEX idx_processes_working_day ON public.processes(working_day);

-- =====================================================
-- 5. FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for auto-updating updated_at
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sheets_updated_at BEFORE UPDATE ON public.sheets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_processes_updated_at BEFORE UPDATE ON public.processes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. VIEWS for Easy Data Access
-- =====================================================

-- View for projects with sheet count
CREATE OR REPLACE VIEW project_summary AS
SELECT 
    p.*,
    COUNT(s.id) as sheet_count
FROM public.projects p
LEFT JOIN public.sheets s ON p.id = s.project_id
GROUP BY p.id, p.name, p.description, p.user_id, p.created_at, p.updated_at;

-- View for sheets with process count
CREATE OR REPLACE VIEW sheet_summary AS
SELECT 
    s.*,
    COUNT(pr.id) as process_count
FROM public.sheets s
LEFT JOIN public.processes pr ON s.id = pr.sheet_id
GROUP BY s.id, s.name, s.description, s.project_id, s.custom_fields, s.created_at, s.updated_at;

-- View for full process data with sheet and project info
CREATE OR REPLACE VIEW process_full AS
SELECT 
    pr.*,
    s.name as sheet_name,
    s.custom_fields as sheet_custom_fields,
    p.name as project_name,
    p.user_id as owner_id
FROM public.processes pr
JOIN public.sheets s ON pr.sheet_id = s.id
JOIN public.projects p ON s.project_id = p.id;

-- =====================================================
-- 7. SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Insert sample project (uncomment for testing)
/*
INSERT INTO public.projects (name, description, user_id) VALUES 
('Sample Manufacturing Process', 'Production line workflow management', auth.uid());

-- Insert sample sheet (uncomment for testing)
INSERT INTO public.sheets (name, description, project_id, custom_fields) VALUES 
('Daily Operations', 'Daily manufacturing operations', 
 (SELECT id FROM public.projects WHERE name = 'Sample Manufacturing Process' LIMIT 1),
 '{"Priority": "select", "Owner": "text", "Status": "select"}');

-- Insert sample processes (uncomment for testing)
INSERT INTO public.processes (short_name, description, working_day, due_time, process_type, sheet_id, custom_data) VALUES 
('START', 'Production start checkpoint', 0, '08:00:00', 'standard', 
 (SELECT id FROM public.sheets WHERE name = 'Daily Operations' LIMIT 1),
 '{"Priority": "High", "Owner": "Team Lead", "Status": "Active"}'),
('SETUP', 'Machine setup and calibration', 0, '08:30:00', 'blocking',
 (SELECT id FROM public.sheets WHERE name = 'Daily Operations' LIMIT 1),
 '{"Priority": "High", "Owner": "Technician", "Status": "Active"}');
*/

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.projects TO authenticated;
GRANT ALL ON public.sheets TO authenticated;
GRANT ALL ON public.processes TO authenticated;
GRANT SELECT ON project_summary TO authenticated;
GRANT SELECT ON sheet_summary TO authenticated;
GRANT SELECT ON process_full TO authenticated;

-- =====================================================
-- 9. PROJECT SHARING SYSTEM TABLES
-- =====================================================

-- Project Members Table
CREATE TABLE public.project_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('FULL_ACCESS', 'EDIT_ACCESS', 'VIEW_ONLY')),
    invited_by UUID REFERENCES auth.users(id),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT project_members_unique UNIQUE (project_id, user_id)
);

-- Project Invitations Table
CREATE TABLE public.project_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('FULL_ACCESS', 'EDIT_ACCESS', 'VIEW_ONLY')),
    invitation_token VARCHAR(255) NOT NULL UNIQUE,
    invited_by UUID REFERENCES auth.users(id),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT project_invitations_unique UNIQUE (project_id, email)
);

-- Working Calendar Table
CREATE TABLE public.working_calendar (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    working_days_json JSONB NOT NULL, -- Array of working day numbers
    holidays_json JSONB DEFAULT '[]', -- Array of holiday dates
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT working_calendar_unique UNIQUE (year, month)
);

-- Process Status History Table
CREATE TABLE public.process_status_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    process_id UUID REFERENCES public.processes(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by UUID REFERENCES auth.users(id),
    change_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 10. EXTEND PROCESSES TABLE
-- =====================================================

-- Add new columns to processes table
ALTER TABLE public.processes 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED_ON_TIME', 'COMPLETED_LATE', 'OVERDUE', 'DELAYED_WITH_REASON')),
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completion_note TEXT,
ADD COLUMN IF NOT EXISTS due_date DATE, -- Calculated from working_day and due_time
ADD COLUMN IF NOT EXISTS actual_due_datetime TIMESTAMP WITH TIME ZONE; -- Full datetime for due

-- =====================================================
-- 11. RLS POLICIES FOR NEW TABLES
-- =====================================================

-- Enable RLS
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.working_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_status_history ENABLE ROW LEVEL SECURITY;

-- Project Members Policies
CREATE POLICY "Users can view members of their projects or projects they are members of" ON public.project_members
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        ) OR user_id = auth.uid()
    );

CREATE POLICY "Project owners can manage members" ON public.project_members
    FOR ALL USING (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        )
    );

-- Project Invitations Policies
CREATE POLICY "Users can view invitations for their projects" ON public.project_invitations
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        ) OR email = auth.email()
    );

CREATE POLICY "Project owners can manage invitations" ON public.project_invitations
    FOR ALL USING (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        )
    );

-- Working Calendar Policies (accessible to all authenticated users)
CREATE POLICY "Authenticated users can view working calendar" ON public.working_calendar
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage working calendar" ON public.working_calendar
    FOR ALL TO authenticated USING (true);

-- Process Status History Policies
CREATE POLICY "Users can view status history for their processes" ON public.process_status_history
    FOR SELECT USING (
        process_id IN (
            SELECT pr.id FROM public.processes pr
            JOIN public.sheets s ON pr.sheet_id = s.id
            JOIN public.projects p ON s.project_id = p.id
            WHERE p.user_id = auth.uid() OR p.id IN (
                SELECT pm.project_id FROM public.project_members pm 
                WHERE pm.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert status history for their processes" ON public.process_status_history
    FOR INSERT WITH CHECK (
        process_id IN (
            SELECT pr.id FROM public.processes pr
            JOIN public.sheets s ON pr.sheet_id = s.id
            JOIN public.projects p ON s.project_id = p.id
            WHERE p.user_id = auth.uid() OR p.id IN (
                SELECT pm.project_id FROM public.project_members pm 
                WHERE pm.user_id = auth.uid() AND pm.role IN ('FULL_ACCESS', 'EDIT_ACCESS')
            )
        )
    );

-- =====================================================
-- 12. UPDATE EXISTING RLS POLICIES FOR SHARED ACCESS
-- =====================================================

-- Update sheets policies to include shared access
DROP POLICY IF EXISTS "Users can view sheets in their projects" ON public.sheets;
DROP POLICY IF EXISTS "Users can insert sheets in their projects" ON public.sheets;
DROP POLICY IF EXISTS "Users can update sheets in their projects" ON public.sheets;
DROP POLICY IF EXISTS "Users can delete sheets in their projects" ON public.sheets;

CREATE POLICY "Users can view sheets in their projects or shared projects" ON public.sheets
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        ) OR project_id IN (
            SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert sheets in their projects or shared projects with edit access" ON public.sheets
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        ) OR project_id IN (
            SELECT pm.project_id FROM public.project_members pm 
            WHERE pm.user_id = auth.uid() AND pm.role IN ('FULL_ACCESS', 'EDIT_ACCESS')
        )
    );

CREATE POLICY "Users can update sheets in their projects or shared projects with edit access" ON public.sheets
    FOR UPDATE USING (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        ) OR project_id IN (
            SELECT pm.project_id FROM public.project_members pm 
            WHERE pm.user_id = auth.uid() AND pm.role IN ('FULL_ACCESS', 'EDIT_ACCESS')
        )
    );

CREATE POLICY "Users can delete sheets in their projects or shared projects with full access" ON public.sheets
    FOR DELETE USING (
        project_id IN (
            SELECT id FROM public.projects WHERE user_id = auth.uid()
        ) OR project_id IN (
            SELECT pm.project_id FROM public.project_members pm 
            WHERE pm.user_id = auth.uid() AND pm.role = 'FULL_ACCESS'
        )
    );

-- Update processes policies to include shared access
DROP POLICY IF EXISTS "Users can view processes in their sheets" ON public.processes;
DROP POLICY IF EXISTS "Users can insert processes in their sheets" ON public.processes;
DROP POLICY IF EXISTS "Users can update processes in their sheets" ON public.processes;
DROP POLICY IF EXISTS "Users can delete processes in their sheets" ON public.processes;

CREATE POLICY "Users can view processes in their sheets or shared sheets" ON public.processes
    FOR SELECT USING (
        sheet_id IN (
            SELECT s.id FROM public.sheets s
            JOIN public.projects p ON s.project_id = p.id
            WHERE p.user_id = auth.uid() OR p.id IN (
                SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert processes in their sheets or shared sheets with edit access" ON public.processes
    FOR INSERT WITH CHECK (
        sheet_id IN (
            SELECT s.id FROM public.sheets s
            JOIN public.projects p ON s.project_id = p.id
            WHERE p.user_id = auth.uid() OR p.id IN (
                SELECT pm.project_id FROM public.project_members pm 
                WHERE pm.user_id = auth.uid() AND pm.role IN ('FULL_ACCESS', 'EDIT_ACCESS')
            )
        )
    );

CREATE POLICY "Users can update processes in their sheets or shared sheets with edit access" ON public.processes
    FOR UPDATE USING (
        sheet_id IN (
            SELECT s.id FROM public.sheets s
            JOIN public.projects p ON s.project_id = p.id
            WHERE p.user_id = auth.uid() OR p.id IN (
                SELECT pm.project_id FROM public.project_members pm 
                WHERE pm.user_id = auth.uid() AND pm.role IN ('FULL_ACCESS', 'EDIT_ACCESS')
            )
        )
    );

CREATE POLICY "Users can delete processes in their sheets or shared sheets with full access" ON public.processes
    FOR DELETE USING (
        sheet_id IN (
            SELECT s.id FROM public.sheets s
            JOIN public.projects p ON s.project_id = p.id
            WHERE p.user_id = auth.uid() OR p.id IN (
                SELECT pm.project_id FROM public.project_members pm 
                WHERE pm.user_id = auth.uid() AND pm.role = 'FULL_ACCESS'
            )
        )
    );

-- =====================================================
-- 13. USEFUL FUNCTIONS FOR WORKING DAYS
-- =====================================================

-- Function to calculate working days for a given month/year
CREATE OR REPLACE FUNCTION calculate_working_days(target_year INTEGER, target_month INTEGER)
RETURNS JSONB AS $$
DECLARE
    start_date DATE;
    end_date DATE;
    current_date DATE;
    working_days INTEGER[];
    day_count INTEGER := 0;
BEGIN
    start_date := DATE (target_year || '-' || target_month || '-01');
    end_date := (start_date + INTERVAL '1 month - 1 day')::DATE;
    current_date := start_date;
    
    WHILE current_date <= end_date LOOP
        -- Skip weekends (Saturday = 6, Sunday = 0)
        IF EXTRACT(DOW FROM current_date) NOT IN (0, 6) THEN
            day_count := day_count + 1;
            working_days := working_days || day_count;
        END IF;
        current_date := current_date + INTERVAL '1 day';
    END LOOP;
    
    RETURN to_jsonb(working_days);
END;
$$ LANGUAGE plpgsql;

-- Function to get actual date for a working day
CREATE OR REPLACE FUNCTION get_actual_date_for_working_day(wd INTEGER, target_year INTEGER, target_month INTEGER)
RETURNS DATE AS $$
DECLARE
    start_date DATE;
    end_date DATE;
    current_date DATE;
    working_day_count INTEGER := 0;
    actual_wd INTEGER;
BEGIN
    -- Handle negative working days (previous month)
    IF wd < 0 THEN
        actual_wd := ABS(wd);
        IF target_month = 1 THEN
            target_year := target_year - 1;
            target_month := 12;
        ELSE
            target_month := target_month - 1;
        END IF;
    ELSE
        actual_wd := wd;
    END IF;
    
    start_date := DATE (target_year || '-' || target_month || '-01');
    end_date := (start_date + INTERVAL '1 month - 1 day')::DATE;
    current_date := start_date;
    
    WHILE current_date <= end_date LOOP
        -- Skip weekends
        IF EXTRACT(DOW FROM current_date) NOT IN (0, 6) THEN
            working_day_count := working_day_count + 1;
            IF working_day_count = actual_wd THEN
                RETURN current_date;
            END IF;
        END IF;
        current_date := current_date + INTERVAL '1 day';
    END LOOP;
    
    RETURN NULL; -- Working day not found
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 14. INDEXES AND PERMISSIONS FOR NEW TABLES
-- =====================================================

-- Indexes for performance
CREATE INDEX idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX idx_project_members_user_id ON public.project_members(user_id);
CREATE INDEX idx_project_invitations_project_id ON public.project_invitations(project_id);
CREATE INDEX idx_project_invitations_email ON public.project_invitations(email);
CREATE INDEX idx_project_invitations_token ON public.project_invitations(invitation_token);
CREATE INDEX idx_working_calendar_year_month ON public.working_calendar(year, month);
CREATE INDEX idx_process_status_history_process_id ON public.process_status_history(process_id);
CREATE INDEX idx_processes_assigned_to ON public.processes(assigned_to);
CREATE INDEX idx_processes_status ON public.processes(status);
CREATE INDEX idx_processes_due_date ON public.processes(due_date);

-- Grant permissions
GRANT ALL ON public.project_members TO authenticated;
GRANT ALL ON public.project_invitations TO authenticated;
GRANT ALL ON public.working_calendar TO authenticated;
GRANT ALL ON public.process_status_history TO authenticated;

-- =====================================================
-- 15. UPDATED VIEWS
-- =====================================================

-- Update process_full view to include new columns
DROP VIEW IF EXISTS process_full;
CREATE OR REPLACE VIEW process_full AS
SELECT 
    pr.*,
    s.name as sheet_name,
    s.custom_fields as sheet_custom_fields,
    p.name as project_name,
    p.user_id as owner_id,
    u.email as assigned_to_email,
    CASE 
        WHEN pr.status = 'OVERDUE' AND pr.due_date < CURRENT_DATE THEN true
        ELSE false
    END as is_overdue
FROM public.processes pr
JOIN public.sheets s ON pr.sheet_id = s.id
JOIN public.projects p ON s.project_id = p.id
LEFT JOIN auth.users u ON pr.assigned_to = u.id;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- To apply this migration:
-- 1. Copy and paste this SQL into Supabase SQL Editor
-- 2. Run the script
-- 3. Verify tables are created with proper RLS policies
-- 4. Test with sample data if needed 