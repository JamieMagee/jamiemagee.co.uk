---
title: A survey of robots.txt - part two
date: '2018-03-22'
type: 'post'
---

In [part one](/posts/a-survey-of-robots-txt-part-one/) of this article, I collected `robots.txt` from the top 1 million sites on the web. In this article I'm going to do some analysis, and see if there's anything interesting to find from all the files I've collected.

<!--more-->

First we'll start with some setup.

```python
%matplotlib inline

import pandas as pd
import numpy as np
import glob
import os
import matplotlib

```

Next I'm going to load the content of each file into my pandas dataframe, calculate the file size, and store that for later.

```python
l = [filename.split('/')[1] for filename in glob.glob('robots-txt/\*')]
df = pd.DataFrame(l, columns=['domain'])
df['content'] = df.apply(lambda x: open('robots-txt/' + x['domain']).read(), axis=1)
df['size'] = df.apply(lambda x: os.path.getsize('robots-txt/' + x['domain']), axis=1)
df.sample(5)
```

<div style="overflow-x: auto">
<table border="1">
  <thead>
    <tr>
      <th></th>
      <th>domain</th>
      <th>content</th>
      <th>size</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>612419</th>
      <td>veapple.com</td>
      <td>User-agent: *\nAllow: /\n\nSitemap: http://www...</td>
      <td>260</td>
    </tr>
    <tr>
      <th>622296</th>
      <td>buscadortransportes.com</td>
      <td>User-agent: *\nDisallow: /out/</td>
      <td>29</td>
    </tr>
    <tr>
      <th>147795</th>
      <td>dailynews360.com</td>
      <td>User-agent: *\nAllow: /\n\nDisallow: /search/\...</td>
      <td>248</td>
    </tr>
    <tr>
      <th>72823</th>
      <td>newfoundlandpower.com</td>
      <td>User-agent: *\nDisallow: /Search.aspx\nDisallo...</td>
      <td>528</td>
    </tr>
    <tr>
      <th>601408</th>
      <td>xfwed.com</td>
      <td>#\n# robots.txt for www.xfwed.com\n# Version 3...</td>
      <td>201</td>
    </tr>
  </tbody>
</table>
</div>

# File sizes

Now that we've done the setup, let's see what the spread of file sizes in `robots.txt` is.

```python
fig = df.plot.hist(title='robots.txt file size', bins=20)
fig.set_yscale('log')

```

![png](/img/analysis_5_0.png)

It looks like the majority of `robots.txt` are under 250KB in size. This is really no surprise as `robots.txt` supports regex, so complex rulesets can be built easily.

Let's take a look at the files larger than 1MB. I can think of three possibilities: they're automatically maintained; they're some other file masquerading as `robots.txt`; or the site is doing something seriously wrong.

```python
large = df[df['size'] > 10 ** 6].sort_values(by='size', ascending=False)
```

```python
import re

def count_directives(value, domain):
content = domain['content']
return len(re.findall(value, content, re.IGNORECASE))

large['disallow'] = large.apply(lambda x: count_directives('Disallow', x), axis=1)
large['user-agent'] = large.apply(lambda x: count_directives('User-agent', x), axis=1)
large['comments'] = large.apply(lambda x: count_directives('#', x), axis=1)

# The directives below are non-standard

large['crawl-delay'] = large.apply(lambda x: count_directives('Crawl-delay', x), axis=1)
large['allow'] = large.apply(lambda x: count_directives('Allow', x), axis=1)
large['sitemap'] = large.apply(lambda x: count_directives('Sitemap', x), axis=1)
large['host'] = large.apply(lambda x: count_directives('Host', x), axis=1)

large

```

<div style="overflow-x: auto">
<table>
  <thead>
    <tr>
      <th></th>
      <th>domain</th>
      <th>content</th>
      <th>size</th>
      <th>disallow</th>
      <th>user-agent</th>
      <th>comments</th>
      <th>crawl-delay</th>
      <th>allow</th>
      <th>sitemap</th>
      <th>host</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>632170</th>
      <td>haberborsa.com.tr</td>
      <td>User-agent: *\nAllow: /\n\nDisallow: /?ref=\nD...</td>
      <td>5820350</td>
      <td>71244</td>
      <td>2</td>
      <td>0</td>
      <td>0</td>
      <td>71245</td>
      <td>5</td>
      <td>10</td>
    </tr>
    <tr>
      <th>23216</th>
      <td>miradavetiye.com</td>
      <td>Sitemap: https://www.miradavetiye.com/sitemap_...</td>
      <td>5028384</td>
      <td>47026</td>
      <td>7</td>
      <td>0</td>
      <td>0</td>
      <td>47026</td>
      <td>2</td>
      <td>0</td>
    </tr>
    <tr>
      <th>282904</th>
      <td>americanrvcompany.com</td>
      <td>Sitemap: http://www.americanrvcompany.com/site...</td>
      <td>4904266</td>
      <td>56846</td>
      <td>1</td>
      <td>1</td>
      <td>0</td>
      <td>56852</td>
      <td>2</td>
      <td>0</td>
    </tr>
    <tr>
      <th>446326</th>
      <td>exibart.com</td>
      <td>User-Agent: *\nAllow: /\nDisallow: /notizia.as...</td>
      <td>3275088</td>
      <td>61403</td>
      <td>1</td>
      <td>0</td>
      <td>0</td>
      <td>61404</td>
      <td>0</td>
      <td>0</td>
    </tr>
    <tr>
      <th>579263</th>
      <td>sinospectroscopy.org.cn</td>
      <td>http://www.sinospectroscopy.org.cn/readnews.ph...</td>
      <td>2979133</td>
      <td>0</td>
      <td>0</td>
      <td>0</td>
      <td>0</td>
      <td>0</td>
      <td>0</td>
      <td>0</td>
    </tr>
    <tr>
      <th>55309</th>
      <td>vibralia.com</td>
      <td># robots.txt automaticaly generated by PrestaS...</td>
      <td>2835552</td>
      <td>39712</td>
      <td>1</td>
      <td>15</td>
      <td>0</td>
      <td>39736</td>
      <td>0</td>
      <td>0</td>
    </tr>
    <tr>
      <th>124850</th>
      <td>oftalmolog30.ru</td>
      <td>User-Agent: *\nHost: chuzmsch.ru\nSitemap: htt...</td>
      <td>2831975</td>
      <td>87752</td>
      <td>1</td>
      <td>0</td>
      <td>0</td>
      <td>87752</td>
      <td>2</td>
      <td>2</td>
    </tr>
    <tr>
      <th>557116</th>
      <td>la-viephoto.com</td>
      <td>User-Agent:*\nDisallow:/aloha_blog/\nDisallow:...</td>
      <td>2768134</td>
      <td>29782</td>
      <td>2</td>
      <td>0</td>
      <td>0</td>
      <td>29782</td>
      <td>2</td>
      <td>0</td>
    </tr>
    <tr>
      <th>677400</th>
      <td>bigclozet.com</td>
      <td>User-agent: *\nDisallow: /item/\n\nUser-agent:...</td>
      <td>2708717</td>
      <td>51221</td>
      <td>4</td>
      <td>0</td>
      <td>0</td>
      <td>51221</td>
      <td>0</td>
      <td>0</td>
    </tr>
    <tr>
      <th>621834</th>
      <td>tranzilla.ru</td>
      <td>Host: tranzilla.ru\nSitemap: http://tranzilla....</td>
      <td>2133091</td>
      <td>27647</td>
      <td>1</td>
      <td>0</td>
      <td>0</td>
      <td>27648</td>
      <td>2</td>
      <td>1</td>
    </tr>
    <tr>
      <th>428735</th>
      <td>autobaraholka.com</td>
      <td>User-Agent: *\nDisallow: /registration/\nDisal...</td>
      <td>1756983</td>
      <td>39330</td>
      <td>1</td>
      <td>0</td>
      <td>0</td>
      <td>39330</td>
      <td>0</td>
      <td>2</td>
    </tr>
    <tr>
      <th>628591</th>
      <td>megasmokers.ru</td>
      <td>User-agent: *\nDisallow: /*route=account/\nDis...</td>
      <td>1633963</td>
      <td>92</td>
      <td>2</td>
      <td>0</td>
      <td>0</td>
      <td>92</td>
      <td>2</td>
      <td>1</td>
    </tr>
    <tr>
      <th>647336</th>
      <td>valencia-cityguide.com</td>
      <td># If the Joomla site is installed within a fol...</td>
      <td>1559086</td>
      <td>17719</td>
      <td>1</td>
      <td>12</td>
      <td>0</td>
      <td>17719</td>
      <td>1</td>
      <td>99</td>
    </tr>
    <tr>
      <th>663372</th>
      <td>vetality.fr</td>
      <td># robots.txt automaticaly generated by PrestaS...</td>
      <td>1536758</td>
      <td>27737</td>
      <td>1</td>
      <td>12</td>
      <td>0</td>
      <td>27737</td>
      <td>0</td>
      <td>0</td>
    </tr>
    <tr>
      <th>105735</th>
      <td>golden-bee.ru</td>
      <td>User-agent: Yandex\nDisallow: /*_openstat\nDis...</td>
      <td>1139308</td>
      <td>24081</td>
      <td>4</td>
      <td>1</td>
      <td>0</td>
      <td>24081</td>
      <td>0</td>
      <td>1</td>
    </tr>
    <tr>
      <th>454311</th>
      <td>dreamitalive.com</td>
      <td>user-agent: google\ndisallow: /memberprofileda...</td>
      <td>1116416</td>
      <td>34392</td>
      <td>3</td>
      <td>0</td>
      <td>0</td>
      <td>34401</td>
      <td>0</td>
      <td>9</td>
    </tr>
    <tr>
      <th>245895</th>
      <td>gobankingrates.com</td>
      <td>User-agent: *\nDisallow: /wp-admin/\nAllow: /w...</td>
      <td>1018109</td>
      <td>7362</td>
      <td>28</td>
      <td>20</td>
      <td>2</td>
      <td>7363</td>
      <td>0</td>
      <td>0</td>
    </tr>
  </tbody>
</table>
</div>

It looks like all of these sites are misusing `Disallow` and `Allow`. In fact, looking at the raw files it appears as if they list all of the articles on the site under an individual `Disallow` command. I can only guess that when publishing an article, a corresponding line in `robots.txt` is added.

Now let's take a look at the smallest `robots.txt`

```python
small = df[df['size'] > 0].sort_values(by='size', ascending=True)

small.head(5)
```

<div>
<table>
  <thead>
    <tr>
      <th></th>
      <th>domain</th>
      <th>content</th>
      <th>size</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>336828</th>
      <td>iforce2d.net</td>
      <td>\n</td>
      <td>1</td>
    </tr>
    <tr>
      <th>55335</th>
      <td>togetherabroad.nl</td>
      <td>\n</td>
      <td>1</td>
    </tr>
    <tr>
      <th>471397</th>
      <td>behchat.ir</td>
      <td>\n</td>
      <td>1</td>
    </tr>
    <tr>
      <th>257727</th>
      <td>docteurtamalou.fr</td>
      <td></td>
      <td>1</td>
    </tr>
    <tr>
      <th>669247</th>
      <td>lastminute-cottages.co.uk</td>
      <td>\n</td>
      <td>1</td>
    </tr>
  </tbody>
</table>
</div>

There's not really anything interesting here, so let's take a look at some larger files

```python
small = df[df['size'] > 10].sort_values(by='size', ascending=True)

small.head(5)

```

<div>
<table>
  <thead>
    <tr>
      <th></th>
      <th>domain</th>
      <th>content</th>
      <th>size</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>676951</th>
      <td>fortisbc.com</td>
      <td>sitemap.xml</td>
      <td>11</td>
    </tr>
    <tr>
      <th>369859</th>
      <td>aurora.com.cn</td>
      <td>User-agent:</td>
      <td>11</td>
    </tr>
    <tr>
      <th>329775</th>
      <td>klue.kr</td>
      <td>Disallow: /</td>
      <td>11</td>
    </tr>
    <tr>
      <th>390064</th>
      <td>chneic.sh.cn</td>
      <td>Disallow: /</td>
      <td>11</td>
    </tr>
    <tr>
      <th>355604</th>
      <td>hpi-mdf.com</td>
      <td>Disallow: /</td>
      <td>11</td>
    </tr>
  </tbody>
</table>
</div>

`Disallow: /` tells all webcrawlers not to crawl anything on this site, and should (hopefully) keep it out of any search engines, but not all webcrawlers follow `robots.txt`.

# User agents

User agents can be listed in `robots.txt` to either `Allow` or `Disallow` certain paths. Let's take a look at the most common webcrawlers.

```python
from collections import Counter

def find_user_agents(content):
    return re.findall('User-agent:? (.*)', content)

user_agent_list = [find_user_agents(x) for x in df['content']]
user_agent_count = Counter(x.strip() for xs in user_agent_list for x in set(xs))
user_agent_count.most_common(n=10)
```

```python
[('*', 587729),
('Mediapartners-Google', 36654),
('Yandex', 29065),
('Googlebot', 25932),
('MJ12bot', 22250),
('Googlebot-Image', 16680),
('Baiduspider', 13646),
('ia_archiver', 13592),
('Nutch', 11204),
('AhrefsBot', 11108)]

```

It's no surprise that the top result is a wildcard (`*`). Google takes spots 2, 4, and 6 with their AdSense, search and image web crawlers respectively. It does seem a little strange to see the AdSense bot listed above the usual search web crawler. Some of the other large search engines' bots are also found in the top 10: Yandex, Baidu, and Yahoo (`Slurp`). `MJ12bot` is a crawler I had not heard of before, but according to [their site](http://mj12bot.com/) it belongs to a UK based SEO company—and according to some of the results about it, it doesn't behave very well. `ia_archiver` belongs to [The Internet Archive](https://archive.org/), and (I assume) crawls pages for the [Wayback Machine](https://archive.org/web/). Finally there is [Apache Nutch](https://nutch.apache.org/bot.html), an open source webcrawler that can be run by anyone.

# Security by obscurity

There are certain paths that you might not want a webcrawler to know about. For example, a `.git` directory, `htpasswd` files, or parts of a site that are still in testing, and aren't meant to be found by anyone on Google. Let's see if there's anything interesting.

```python
sec_obs = ['\.git', 'alpha', 'beta', 'secret', 'htpasswd', 'install\.php', 'setup\.php']
sec_obs_regex = re.compile('|'.join(sec_obs))

def find_security_by_obscurity(content):
return sec_obs_regex.findall(content)

sec_obs_list = [find_security_by_obscurity(x) for x in df['content']]
sec_obs_count = Counter(x.strip() for xs in sec_obs_list for x in set(xs))
sec_obs_count.most_common(10)
```

```python
[('install.php', 28925),
('beta', 2834),
('secret', 753),
('alpha', 597),
('.git', 436),
('setup.php', 73),
('htpasswd', 45)]

```

Just because a file or directory is mentioned in `robots.txt`, it doesn't mean that it can actually be accessed. However, if even 1% of Wordpress installs leave their `install.php` open to the world, that's still a lot of vulnerable sites. Any attacker could get the keys to the kingdom very easily. The same goes for a `.git` directory. Even if it is read-only, people accidentally commit secrets to their git repository all the time.

# Conclusion

`robots.txt` is a fairly innocuous part of the web. It's been interesting to see how popular websites (ab)use it, and which web crawlers are naughty or nice. Most of all this has been a great exercise for myself in collecting data and analysing it using pandas and Jupyter.

The full data set is released under the [Open Database License (ODbL) v1.0](https://opendatacommons.org/licenses/odbl/1.0/) and can be found [on GitHub](https://github.com/JamieMagee/robots-txt)

```

```
