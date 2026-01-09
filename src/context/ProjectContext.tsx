'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Project } from '@/types';
import { projectService } from '@/services/projectService';

import { useUser } from '@/context/UserContext';

interface ProjectContextType {
    projects: Project[];
    isLoading: boolean;
    addProject: (project: Partial<Project>) => Promise<void>;
    updateProject: (project: Project) => Promise<void>;
    deleteProject: (id: string) => Promise<boolean>;
    getProject: (id: string) => Project | undefined;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
    console.log("ProjectProvider: Rendering");
    const { currentUser, isLoading: userLoading } = useUser();
    console.log("ProjectProvider: Got User", { currentUser, userLoading });
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!userLoading) {
            if (currentUser) {
                loadProjects(currentUser.id);
            } else {
                setProjects([]);
                setIsLoading(false);
            }
        }
    }, [userLoading, currentUser]);

    const loadProjects = async (userId: string) => {
        try {
            setIsLoading(true);
            const data = await projectService.getProjects(userId);
            setProjects(data);
        } catch (error) {
            console.error("Failed to load projects", error);
        } finally {
            setIsLoading(false);
        }
    };

    const addProject = async (project: Partial<Project>) => {
        try {
            const projectWithId = {
                ...project,
                engineerId: currentUser?.id
            };
            const newProject = await projectService.createProject(projectWithId);
            if (newProject) {
                setProjects(prev => [newProject, ...prev]);
            }
        } catch (error) {
            console.error("Failed to add project", error);
        }
    };

    const updateProject = async (updated: Project) => {
        try {
            const success = await projectService.updateProject(updated.id, updated);
            if (success) {
                setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
            }
        } catch (error) {
            console.error("Failed to update project", error);
        }
    };

    const deleteProject = async (id: string): Promise<boolean> => {
        try {
            const success = await projectService.deleteProjectAPI(id);
            if (success) {
                setProjects(prev => prev.filter(p => p.id !== id));
            }
            return success;
        } catch (error) {
            console.error("Failed to delete project", error);
            return false;
        }
    };

    const getProject = (id: string) => {
        if (!projects || !Array.isArray(projects)) return undefined;
        return projects.find(p => p.id === id);
    };

    return (
        <ProjectContext.Provider value={{ projects, isLoading, addProject, updateProject, deleteProject, getProject }}>
            {children}
        </ProjectContext.Provider>
    );
}

export function useProjects() {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error('useProjects must be used within a ProjectProvider');
    }
    return context;
}
