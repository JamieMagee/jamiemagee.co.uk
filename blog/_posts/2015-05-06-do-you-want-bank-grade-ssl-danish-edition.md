---
layout: post
title: Do you really want "bank grade" security in your SSL? Danish edition
comments: true
---

I recently saw an article on [/r/programming](https://www.reddit.com/r/programming) called [Do you really want "bank grade" security in your SSL? Here's how Aussie banks fare](http://www.troyhunt.com/2015/05/do-you-really-want-bank-grade-security.html). The author used [Qualys SSL Labs test](https://www.ssllabs.com/ssltest/) to determine how good Aussie banks' SSL implementations really are. I thought the article was great, and gave good, actionable feedback. At the time of writing this two of the banks listed have already improved their SSL scores.

It got me thinking: how well (or badly) do banks in Denmark fare? We put our trust - and our money - in these banks, but do they really deserve it? The banks I'll be testing come from the [list of systemically important banks](https://en.wikipedia.org/wiki/List_of_systemically_important_banks), more commonly known as "Too big to fail." The list consists of:
 
* Danske Bank
* Nykredit
* Nordea
* Jyske Bank
* Sydbank
* DLR Kredit

TODO: Write an explanation of each test

I've got my list of sites, and my test all sorted. Let's dive right in!

<table>
  <thead>
    <tr style="text-align: center">
      <th>Bank</th>
      <th>Grade</th>
      <th>SSL 3</th>
      <th>TLS 1.2</th>
      <th>SHA1</th>
      <th>RC4</th>
      <th>Forward Secrecy</th>
      <th>POODLE</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="https://www.ssllabs.com/ssltest/analyze.html?d=danskebank.dk">Danske Bank</a></td>
      <td class="grade-a">A-</td>
      <td class="pass">Pass</td>
      <td class="pass">Pass</td>
      <td class="pass">Pass<sup>1</sup></td>
      <td class="pass">Pass</td>
      <td class="fail">Fail</td>
      <td class="pass">Pass</td>
    </tr>
    <tr>
      <td><a href="https://www.ssllabs.com/ssltest/analyze.html?d=netbank.nordea.dk">Nordea</a></td>
      <td class="grade-b">B</td>
      <td class="pass">Pass</td>
      <td class="fail">Fail</td>
      <td class="fail">Fail<sup>2</sup></td>
      <td class="fail">Fail</td>
      <td class="fail">Fail</td>
      <td class="pass">Pass</td>
    </tr>
    <tr>
      <td><a href="https://www.ssllabs.com/ssltest/analyze.html?d=dlr.dk">DLR Kredit</a></td>
      <td class="grade-c">C</td>
      <td class="fail">Fail</td>
      <td class="fail">Fail</td>
      <td class="fail">Fail</td>
      <td class="fail">Fail</td>
      <td class="fail">Fail</td>
      <td class="fail">Fail<sup>3</sup></td>
    </tr>
    <tr>
      <td><a href="https://www.ssllabs.com/ssltest/analyze.html?d=portal.jyskebank.dk">Jyske Bank</a></td>
      <td class="grade-f">F</td>
      <td class="pass">Pass</td>
      <td class="fail">Fail</td>
      <td class="pass">Pass</td>
      <td class="fail">Fail</td>
      <td class="fail">Fail</td>
      <td class="fail">Fail</td>
    </tr>
    <tr>
      <td><a href="https://www.ssllabs.com/ssltest/analyze.html?d=mitnykredit.dk">Nykredit</a></td>
      <td class="grade-f">F</td>
      <td class="fail">Fail</td>
      <td class="fail">Fail</td>
      <td class="fail">Fail</td>
      <td class="fail">Fail</td>
      <td class="fail">Fail</td>
      <td class="fail">Fail</td>
    </tr>
    <tr>
      <td><a href="https://www.ssllabs.com/ssltest/analyze.html?d=portal4.sydbank.dk">Sydbank</a></td>
      <td class="grade-f">F</td>
      <td class="pass">Pass</td>
      <td class="fail">Fail</td>
      <td class="pass">Pass</td>
      <td class="fail">Fail</td>
      <td class="fail">Fail</td>
      <td class="fail">Fail</td>
    </tr>
  </tbody>
</table>