
'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, GripVertical } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch, query, orderBy } from 'firebase/firestore';
import type { Blog } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import Image from 'next/image';


export default function BlogManagementPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const blogsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'blogs'), orderBy('createdAt', 'desc'));
  }, [firestore]);
  
  const { data: blogs, isLoading } = useCollection<Blog>(blogsCollection);

  const [featuredBlogs, setFeaturedBlogs] = useState<Blog[]>([]);
  const [nonFeaturedBlogs, setNonFeaturedBlogs] = useState<Blog[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (blogs) {
      const featured = blogs
        .filter(b => b.featured)
        .sort((a, b) => (a.featuredPosition || 0) - (b.featuredPosition || 0));
      const nonFeatured = blogs.filter(b => !b.featured);
      setFeaturedBlogs(featured);
      setNonFeaturedBlogs(nonFeatured);
    }
  }, [blogs]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && firestore) {
      const oldIndex = featuredBlogs.findIndex(b => b.id === active.id);
      const newIndex = featuredBlogs.findIndex(b => b.id === over?.id);
      
      const newOrder = arrayMove(featuredBlogs, oldIndex, newIndex);
      setFeaturedBlogs(newOrder);

      try {
        const batch = writeBatch(firestore);
        newOrder.forEach((blog, index) => {
          const blogRef = doc(firestore, 'blogs', blog.id);
          batch.update(blogRef, { featuredPosition: index + 1 });
        });
        await batch.commit();
        toast({
          title: 'Reordering Successful',
          description: 'Featured blogs have been reordered.',
        });
      } catch (error) {
        console.error("Error reordering blogs: ", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to reorder blogs.",
        });
        // Revert state on error by re-fetching from original blogs prop
         const originalOrder = blogs
            ?.filter(b => b.featured)
            .sort((a, b) => (a.featuredPosition || 0) - (b.featuredPosition || 0));
         if (originalOrder) setFeaturedBlogs(originalOrder);
      }
    }
  };

  const handleDelete = async (blogId: string, isFeatured: boolean) => {
     if (!firestore) return;
     if(confirm('Are you sure you want to delete this blog post? This cannot be undone.')) {
        try {
            const batch = writeBatch(firestore);
            const blogRef = doc(firestore, 'blogs', blogId);
            batch.delete(blogRef);

            if (isFeatured) {
                const remainingFeatured = featuredBlogs.filter(b => b.id !== blogId);
                remainingFeatured.forEach((blog, index) => {
                    const otherBlogRef = doc(firestore, 'blogs', blog.id);
                    batch.update(otherBlogRef, { featuredPosition: index + 1 });
                });
            }

            await batch.commit();
            toast({
                title: 'Blog Post Deleted',
                description: 'The blog post has been successfully removed.',
            });
        } catch (error) {
            console.error("Error deleting blog: ", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to delete blog post.",
            });
        }
     }
  };

  const renderBlogList = (blogList: Blog[], isFeatured: boolean) => {
    if (isLoading) {
        return <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>;
    }

    if (blogList.length === 0) {
        return <p className="text-center text-muted-foreground py-6">No {isFeatured ? 'featured' : ''} blog posts found.</p>;
    }
    
    if (isFeatured) {
        return (
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
            >
                <SortableContext items={blogList} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                        {blogList.map((blog) => (
                           <SortableBlogListItem key={blog.id} blog={blog} onDelete={() => handleDelete(blog.id, true)} />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        );
    }
    
    return (
        <div className="space-y-3">
            {blogList.map(blog => (
                <BlogListItem key={blog.id} blog={blog} onDelete={() => handleDelete(blog.id, false)} isSortable={false} />
            ))}
        </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-headline font-bold">Blog Management</h1>
            <p className="text-muted-foreground">Create, edit, and manage all your blog posts.</p>
        </div>
        <Link href="/dashboard/blogs/create">
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Create Blog Post
            </Button>
        </Link>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6 items-start">
        <Card>
            <CardHeader>
                <CardTitle>Featured Blogs</CardTitle>
                <CardDescription>Drag and drop to reorder featured posts.</CardDescription>
            </CardHeader>
            <CardContent>
                {renderBlogList(featuredBlogs, true)}
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>All Other Blogs</CardTitle>
                <CardDescription>All non-featured blog posts.</CardDescription>
            </CardHeader>
            <CardContent>
                {renderBlogList(nonFeaturedBlogs, false)}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface BlogListItemProps {
    blog: Blog;
    onDelete: () => void;
    isSortable?: boolean;
}

const BlogListItem = ({ blog, onDelete, isSortable = false, ...props }: BlogListItemProps & React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props} className="flex items-center gap-4 p-2 rounded-lg border bg-card hover:bg-muted transition-colors">
        {isSortable && <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />}
        <Image
            src={blog.contentImage || 'https://placehold.co/100x100'}
            alt={blog.title}
            width={64}
            height={64}
            className="rounded-md object-cover w-16 h-16"
        />
        <div className="flex-1">
            <p className="font-semibold">{blog.title}</p>
            <p className="text-sm text-muted-foreground">{blog.previewHeader}</p>
        </div>
        <div className="flex items-center gap-2">
            <Link href={`/dashboard/blogs/edit/${blog.id}`}>
                <Button variant="outline" size="icon">
                    <Edit className="h-4 w-4" />
                </Button>
            </Link>
            <Button variant="destructive" size="icon" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    </div>
);

const SortableBlogListItem = ({ blog, onDelete }: Omit<BlogListItemProps, 'isSortable'>) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: blog.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <BlogListItem
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            blog={blog}
            onDelete={onDelete}
            isSortable={true}
        />
    );
};
