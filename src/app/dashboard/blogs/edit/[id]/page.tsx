
'use client';

import { BlogForm } from '@/components/dashboard/blogs/blog-form';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Blog } from '@/lib/types';
import { collection, doc, updateDoc, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditBlogPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();
    const { id } = useParams() as { id: string };

    const blogRef = useMemoFirebase(() => (firestore && id ? doc(firestore, 'blogs', id) : null), [firestore, id]);
    const { data: blog, isLoading } = useDoc<Blog>(blogRef);

    const handleUpdateBlog = async (values: Partial<Omit<Blog, 'id' | 'createdAt'>>) => {
        if (!firestore || !blog) return;

        try {
            const batch = writeBatch(firestore);
            const currentBlogRef = doc(firestore, 'blogs', blog.id);

            const wasFeatured = blog.featured;
            const isNowFeatured = values.featured;

            const dataToUpdate: Partial<Blog> = { ...values };

            // Case 1: Post is becoming featured
            if (!wasFeatured && isNowFeatured) {
                const blogsRef = collection(firestore, "blogs");
                const q = query(blogsRef, where("featured", "==", true));
                const featuredSnapshot = await getDocs(q);
                dataToUpdate.featuredPosition = featuredSnapshot.size + 1;
            } 
            // Case 2: Post is no longer featured
            else if (wasFeatured && !isNowFeatured) {
                dataToUpdate.featuredPosition = 0; // or delete field
                const blogsRef = collection(firestore, "blogs");
                const q = query(blogsRef, where("featured", "==", true), where("featuredPosition", ">", blog.featuredPosition || 0));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach((docSnapshot) => {
                    const otherBlogRef = doc(firestore, 'blogs', docSnapshot.id);
                    batch.update(otherBlogRef, { featuredPosition: (docSnapshot.data().featuredPosition || 1) - 1 });
                });
            }

            batch.update(currentBlogRef, dataToUpdate);

            await batch.commit();

            toast({
                title: 'Blog Post Updated',
                description: 'Your blog post has been successfully updated.',
            });
            router.push('/dashboard/blogs');

        } catch (error) {
            console.error('Error updating blog post: ', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'An error occurred while updating the blog post.',
            });
        }
    };

    if (isLoading || !blog) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-headline font-bold">Edit Blog Post</h1>
                    <p className="text-muted-foreground">Update the details for your post.</p>
                </div>
            </div>
            <BlogForm blog={blog} onSubmit={handleUpdateBlog} />
        </div>
    );
}

