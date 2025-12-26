
'use client';

import { BlogForm } from '@/components/dashboard/blogs/blog-form';
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Blog } from '@/lib/types';
import { collection, addDoc, serverTimestamp, getDocs, query, where, writeBatch, doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function CreateBlogPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();
    const { user } = useUser();
    
    const handleCreateBlog = async (values: Omit<Blog, 'id' | 'createdAt' | 'featuredPosition'>) => {
        if (!firestore || !user) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not create blog post.' });
            return;
        }

        try {
            const blogsRef = collection(firestore, 'blogs');
            const dataToSave: Partial<Blog> = {
                ...values,
                authorId: user.uid,
                createdAt: serverTimestamp() as any,
            };

            if (values.featured) {
                const q = query(blogsRef, where("featured", "==", true));
                const featuredSnapshot = await getDocs(q);
                const newPosition = featuredSnapshot.size + 1;
                dataToSave.featuredPosition = newPosition;

                const newDocRef = doc(blogsRef); // create a reference with a new ID
                
                const batch = writeBatch(firestore);
                batch.set(newDocRef, dataToSave);
                
                await batch.commit();

            } else {
                 await addDoc(blogsRef, dataToSave);
            }

            toast({
                title: 'Blog Post Created',
                description: 'Your new blog post has been successfully created.',
            });
            router.push('/dashboard/blogs');

        } catch (error) {
            console.error('Error creating blog post: ', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'An error occurred while creating the blog post.',
            });
        }
    };
    
    return (
        <div>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-headline font-bold">Create New Blog Post</h1>
                    <p className="text-muted-foreground">Fill in the details to publish a new post.</p>
                </div>
            </div>
            <BlogForm onSubmit={handleCreateBlog} />
        </div>
    );
}

