-- Create genres table
CREATE TABLE public.genres (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Genres are viewable by everyone" ON public.genres FOR SELECT USING (true);
CREATE POLICY "Admins can insert genres" ON public.genres FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update genres" ON public.genres FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete genres" ON public.genres FOR DELETE USING (public.is_admin(auth.uid()));

-- Create countries table
CREATE TABLE public.countries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Countries are viewable by everyone" ON public.countries FOR SELECT USING (true);
CREATE POLICY "Admins can insert countries" ON public.countries FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update countries" ON public.countries FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete countries" ON public.countries FOR DELETE USING (public.is_admin(auth.uid()));

-- Create years table
CREATE TABLE public.years (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.years ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Years are viewable by everyone" ON public.years FOR SELECT USING (true);
CREATE POLICY "Admins can insert years" ON public.years FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update years" ON public.years FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete years" ON public.years FOR DELETE USING (public.is_admin(auth.uid()));

-- Create tags table
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tags are viewable by everyone" ON public.tags FOR SELECT USING (true);
CREATE POLICY "Admins can insert tags" ON public.tags FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update tags" ON public.tags FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete tags" ON public.tags FOR DELETE USING (public.is_admin(auth.uid()));

-- Create directors table
CREATE TABLE public.directors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.directors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Directors are viewable by everyone" ON public.directors FOR SELECT USING (true);
CREATE POLICY "Admins can insert directors" ON public.directors FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update directors" ON public.directors FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete directors" ON public.directors FOR DELETE USING (public.is_admin(auth.uid()));

-- Create actors table
CREATE TABLE public.actors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.actors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Actors are viewable by everyone" ON public.actors FOR SELECT USING (true);
CREATE POLICY "Admins can insert actors" ON public.actors FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update actors" ON public.actors FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete actors" ON public.actors FOR DELETE USING (public.is_admin(auth.uid()));

-- Create movies table
CREATE TABLE public.movies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  origin_name TEXT,
  content TEXT,
  type TEXT NOT NULL DEFAULT 'single',
  status TEXT NOT NULL DEFAULT 'ongoing',
  poster_url TEXT,
  thumb_url TEXT,
  trailer_url TEXT,
  time TEXT,
  episode_current TEXT,
  episode_total TEXT,
  quality TEXT,
  lang TEXT,
  year INTEGER,
  view_count INTEGER NOT NULL DEFAULT 0,
  view_day INTEGER NOT NULL DEFAULT 0,
  view_week INTEGER NOT NULL DEFAULT 0,
  view_month INTEGER NOT NULL DEFAULT 0,
  is_copyright BOOLEAN NOT NULL DEFAULT false,
  chieurap BOOLEAN NOT NULL DEFAULT false,
  sub_docquyen BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Movies are viewable by everyone" ON public.movies FOR SELECT USING (true);
CREATE POLICY "Admins can insert movies" ON public.movies FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update movies" ON public.movies FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete movies" ON public.movies FOR DELETE USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_movies_updated_at BEFORE UPDATE ON public.movies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create movie_genres junction table
CREATE TABLE public.movie_genres (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  genre_id UUID NOT NULL REFERENCES public.genres(id) ON DELETE CASCADE,
  UNIQUE(movie_id, genre_id)
);

ALTER TABLE public.movie_genres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Movie genres are viewable by everyone" ON public.movie_genres FOR SELECT USING (true);
CREATE POLICY "Admins can insert movie genres" ON public.movie_genres FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete movie genres" ON public.movie_genres FOR DELETE USING (public.is_admin(auth.uid()));

-- Create movie_countries junction table
CREATE TABLE public.movie_countries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  UNIQUE(movie_id, country_id)
);

ALTER TABLE public.movie_countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Movie countries are viewable by everyone" ON public.movie_countries FOR SELECT USING (true);
CREATE POLICY "Admins can insert movie countries" ON public.movie_countries FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete movie countries" ON public.movie_countries FOR DELETE USING (public.is_admin(auth.uid()));

-- Create movie_tags junction table
CREATE TABLE public.movie_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  UNIQUE(movie_id, tag_id)
);

ALTER TABLE public.movie_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Movie tags are viewable by everyone" ON public.movie_tags FOR SELECT USING (true);
CREATE POLICY "Admins can insert movie tags" ON public.movie_tags FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete movie tags" ON public.movie_tags FOR DELETE USING (public.is_admin(auth.uid()));

-- Create movie_directors junction table
CREATE TABLE public.movie_directors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  director_id UUID NOT NULL REFERENCES public.directors(id) ON DELETE CASCADE,
  UNIQUE(movie_id, director_id)
);

ALTER TABLE public.movie_directors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Movie directors are viewable by everyone" ON public.movie_directors FOR SELECT USING (true);
CREATE POLICY "Admins can insert movie directors" ON public.movie_directors FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete movie directors" ON public.movie_directors FOR DELETE USING (public.is_admin(auth.uid()));

-- Create movie_actors junction table
CREATE TABLE public.movie_actors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
  UNIQUE(movie_id, actor_id)
);

ALTER TABLE public.movie_actors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Movie actors are viewable by everyone" ON public.movie_actors FOR SELECT USING (true);
CREATE POLICY "Admins can insert movie actors" ON public.movie_actors FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete movie actors" ON public.movie_actors FOR DELETE USING (public.is_admin(auth.uid()));

-- Create episodes table
CREATE TABLE public.episodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  server_name TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  filename TEXT,
  link_embed TEXT,
  link_m3u8 TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Episodes are viewable by everyone" ON public.episodes FOR SELECT USING (true);
CREATE POLICY "Admins can insert episodes" ON public.episodes FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update episodes" ON public.episodes FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete episodes" ON public.episodes FOR DELETE USING (public.is_admin(auth.uid()));

-- Create crawl_logs table
CREATE TABLE public.crawl_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  movies_added INTEGER NOT NULL DEFAULT 0,
  movies_updated INTEGER NOT NULL DEFAULT 0,
  duration TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crawl_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Crawl logs are viewable by admins" ON public.crawl_logs FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert crawl logs" ON public.crawl_logs FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update crawl logs" ON public.crawl_logs FOR UPDATE USING (public.is_admin(auth.uid()));